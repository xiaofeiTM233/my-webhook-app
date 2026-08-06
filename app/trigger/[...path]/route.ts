// app/trigger/[...path]/route.ts
import dbConnect from '@/lib/db';
import Rule from '@/models/Rule';
import type { IActionDocument } from '@/models/Action';
import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifly';

const MAX_RECURSION_DEPTH = 10;

async function buildContext(request: NextRequest, path: string[]) {
  const body = request.method !== 'GET'
    ? await request.json().catch(() => ({}))
    : {};
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });

  const url = new URL(request.url);
  return {
    path: '/' + (path?.join('/') || ''),
    method: request.method,
    host: headers['host'] || '',
    sourceIp: headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown',
    query: Object.fromEntries(url.searchParams.entries()),
    headers,
    body,
  };
}

// 支持所有 HTTP 方法
export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleTrigger(request, ctx);
}
export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleTrigger(request, ctx);
}
export async function PUT(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleTrigger(request, ctx);
}
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleTrigger(request, ctx);
}
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleTrigger(request, ctx);
}
export async function HEAD(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleTrigger(request, ctx);
}
export async function OPTIONS(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return handleTrigger(request, ctx);
}

async function handleTrigger(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    await dbConnect();
    const { path } = await params;
    const context = await buildContext(request, path);

    const rules = await Rule.find({ enabled: true })
      .sort({ priority: 1 })
      .populate('actionIds')
      .lean();

    const matchedRules: typeof rules = [];
    for (const rule of rules) {
      if (evaluateConditionGroup(rule.conditionGroup, context, 0)) {
        matchedRules.push(rule);
      }
    }

    if (matchedRules.length === 0) {
      return NextResponse.json({ success: false, error: '无匹配的规则' }, { status: 404 });
    }

    const results: Array<{
      ruleId: string;
      ruleName: string;
      actions: Array<{ actionId: string; actionName: string; result: unknown }>;
    }> = [];

    for (const rule of matchedRules) {
      const ruleResult = {
        ruleId: rule._id.toString(),
        ruleName: rule.name,
        actions: [] as Array<{ actionId: string; actionName: string; result: unknown }>,
      };

      const resolvedParams = resolveParameters(rule.parameterMappings || [], context);

      for (const actionDoc of rule.actionIds) {
        const action = actionDoc as unknown as IActionDocument;
        const actionResult = await executeAction(action, resolvedParams, context);
        ruleResult.actions.push({
          actionId: action._id.toString(),
          actionName: action.name,
          result: actionResult,
        });
      }

      results.push(ruleResult);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 条件匹配引擎
function evaluateConditionGroup(
  group: { logic: 'AND' | 'OR'; conditions: unknown[]; groups?: unknown[] },
  context: Record<string, unknown>,
  depth: number,
): boolean {
  if (depth > MAX_RECURSION_DEPTH) return false;
  const results: boolean[] = [];

  for (const condition of group.conditions as Array<{
    field: string; operator: string; key?: string; value?: unknown;
  }>) {
    results.push(evaluateCondition(condition, context));
  }

  for (const nestedGroup of (group.groups || []) as Array<{
    logic: 'AND' | 'OR'; conditions: unknown[]; groups?: unknown[];
  }>) {
    results.push(evaluateConditionGroup(nestedGroup, context, depth + 1));
  }

  if (results.length === 0) return true;
  return group.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

function evaluateCondition(
  condition: { field: string; operator: string; key?: string; value?: unknown },
  context: Record<string, unknown>,
): boolean {
  let fieldValue: unknown;

  switch (condition.field) {
    case 'path':      fieldValue = context.path; break;
    case 'method':    fieldValue = context.method; break;
    case 'host':      fieldValue = context.host; break;
    case 'source_ip': fieldValue = context.sourceIp; break;
    case 'query':
      fieldValue = condition.key
        ? (context.query as Record<string, string>)?.[condition.key]
        : JSON.stringify(context.query);
      break;
    case 'header':
      fieldValue = condition.key
        ? (context.headers as Record<string, string>)?.[condition.key.toLowerCase()]
        : JSON.stringify(context.headers);
      break;
    case 'body':
      fieldValue = condition.key
        ? getJsonPath(context.body, condition.key)
        : JSON.stringify(context.body);
      break;
    default:
      return false;
  }

  return applyOperator(condition.operator, fieldValue, condition.value);
}

function applyOperator(operator: string, fieldValue: unknown, expectedValue: unknown): boolean {
  const fv = typeof fieldValue === 'string' ? fieldValue : String(fieldValue ?? '');

  switch (operator) {
    case 'equals':      return fv === String(expectedValue);
    case 'not_equals':  return fv !== String(expectedValue);
    case 'contains':    return fv.includes(String(expectedValue));
    case 'not_contains': return !fv.includes(String(expectedValue));
    case 'starts_with': return fv.startsWith(String(expectedValue));
    case 'ends_with':   return fv.endsWith(String(expectedValue));
    case 'regex':
      try { return new RegExp(String(expectedValue)).test(fv); } catch { return false; }
    case 'exists':      return fieldValue !== undefined && fieldValue !== null;
    case 'not_exists':  return fieldValue === undefined || fieldValue === null;
    case 'in':          return Array.isArray(expectedValue) ? expectedValue.map(String).includes(fv) : false;
    case 'not_in':      return Array.isArray(expectedValue) ? !expectedValue.map(String).includes(fv) : true;
    case 'gt':          return parseFloat(fv) > parseFloat(String(expectedValue));
    case 'gte':         return parseFloat(fv) >= parseFloat(String(expectedValue));
    case 'lt':          return parseFloat(fv) < parseFloat(String(expectedValue));
    case 'lte':         return parseFloat(fv) <= parseFloat(String(expectedValue));
    default:            return false;
  }
}

// JSONPath — 支持点号和数组索引
function getJsonPath(obj: unknown, path: string): unknown {
  try {
    const parts = path.replace(/^\$\.?/, '').split(/(?<!\[)\.(?!\d)|(?<=\])(?!\d)\./).filter(Boolean);
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      const arrMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrMatch) {
        const arr = (current as Record<string, unknown>)[arrMatch[1]];
        current = Array.isArray(arr) ? arr[parseInt(arrMatch[2])] : undefined;
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }
    return current;
  } catch {
    return undefined;
  }
}

// 参数解析
function resolveParameters(
  mappings: Array<{ name: string; source: string; sourcePath?: string; staticValue?: string }>,
  context: Record<string, unknown>,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const mapping of mappings) {
    switch (mapping.source) {
      case 'match_target':
        params[mapping.name] = context.path; break;
      case 'query':
        params[mapping.name] = mapping.sourcePath
          ? (context.query as Record<string, string>)?.[mapping.sourcePath] : context.query;
        break;
      case 'header':
        params[mapping.name] = mapping.sourcePath
          ? (context.headers as Record<string, string>)?.[mapping.sourcePath.toLowerCase()] : context.headers;
        break;
      case 'body_json':
        params[mapping.name] = mapping.sourcePath
          ? getJsonPath(context.body, mapping.sourcePath) : context.body;
        break;
      case 'static':
        params[mapping.name] = mapping.staticValue; break;
    }
  }
  return params;
}

// 模板变量替换
function resolveTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{([\w\[\]\.]+)\}\}/g, (_, key) => {
    const value = getJsonPath(variables, key);
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

function resolveValue(value: unknown, variables: Record<string, unknown>): unknown {
  if (typeof value === 'string') return resolveTemplate(value, variables);
  if (Array.isArray(value)) return value.map((v) => resolveValue(v, variables));
  if (typeof value === 'object' && value !== null) {
    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      resolved[k] = resolveValue(v, variables);
    }
    return resolved;
  }
  return value;
}

// Action 执行引擎
async function executeAction(
  action: IActionDocument,
  params: Record<string, unknown>,
  context: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const stepOutputs: Record<string, unknown> = { rule_params: params, context };

  const enabledSteps = action.steps
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const globalDeadline = action.globalTimeout
    ? Date.now() + action.globalTimeout
    : undefined;

  let retries = 0;
  const maxRetries = action.retryPolicy?.maxRetries || 0;
  const retryDelay = action.retryPolicy?.retryDelay || 1000;
  const backoff = action.retryPolicy?.backoffMultiplier || 1;

  let actionFailed = false;

  for (const step of enabledSteps) {
    if (globalDeadline && Date.now() > globalDeadline) {
      stepOutputs['_timeout'] = { success: false, error: 'Action 全局超时' };
      break;
    }

    if (step.dependsOn?.length) {
      const allDepsOk = step.dependsOn.every((depId) => {
        const depOutput = stepOutputs[depId];
        return depOutput && (depOutput as Record<string, unknown>).success !== false;
      });
      if (!allDepsOk) continue;
    }

    if (step.condition) {
      const condValue = getJsonPath(stepOutputs[step.condition.stepId], step.condition.jsonPath);
      if (!applyOperator(step.condition.operator, condValue, step.condition.value)) continue;
    }

    const stepDeadline = step.timeout ? Date.now() + step.timeout : globalDeadline;

    try {
      const result = await executeStepWithTimeout(step, stepOutputs, stepDeadline);
      stepOutputs[step.stepId] = result;

      if (!(result as Record<string, unknown>).success) {
        actionFailed = true;
        if (!step.continueOnError) break;
      }
    } catch (err) {
      stepOutputs[step.stepId] = { success: false, error: (err as Error).message };
      actionFailed = true;
      if (!step.continueOnError) break;
    }
  }

  // 全局重试：整个 action 失败时重试
  while (actionFailed && retries < maxRetries) {
    retries++;
    await new Promise((r) => setTimeout(r, retryDelay * Math.pow(backoff, retries - 1)));
    actionFailed = false;
    // 重试只重跑之前失败的步骤，这里简化为重跑全部
    for (const step of enabledSteps) {
      if (globalDeadline && Date.now() > globalDeadline) break;
      try {
        const result = await executeStepWithTimeout(step, stepOutputs, globalDeadline);
        stepOutputs[step.stepId] = result;
        if (!(result as Record<string, unknown>).success) {
          actionFailed = true;
          if (!step.continueOnError) break;
        }
      } catch {
        actionFailed = true;
        if (!step.continueOnError) break;
      }
    }
  }

  return stepOutputs;
}

async function executeStepWithTimeout(
  step: IActionDocument['steps'][number],
  variables: Record<string, unknown>,
  deadline?: number,
): Promise<unknown> {
  if (deadline) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('步骤超时');
    return Promise.race([
      executeStep(step, variables),
      new Promise((_, reject) => setTimeout(() => reject(new Error('步骤超时')), remaining)),
    ]);
  }
  return executeStep(step, variables);
}

async function executeStep(
  step: IActionDocument['steps'][number],
  variables: Record<string, unknown>,
): Promise<unknown> {
  switch (step.type) {
    case 'webhook': {
      const config = step.config as {
        url: string; method: string; headers?: Record<string, string>;
        body?: unknown; contentType?: string; timeout?: number;
        retryCount?: number; retryDelay?: number;
        successCondition?: { type: string; operator: string; value: string };
      };

      const resolvedUrl = resolveTemplate(config.url, variables);
      const resolvedHeaders: Record<string, string> = {};
      if (config.headers) {
        for (const [k, v] of Object.entries(config.headers)) {
          resolvedHeaders[k] = resolveTemplate(v, variables);
        }
      }
      const resolvedBody = resolveValue(config.body, variables);

      const contentType = config.contentType || 'application/json';
      let bodyInit: BodyInit | undefined;
      if (resolvedBody !== undefined && resolvedBody !== null) {
        if (contentType === 'application/json') {
          bodyInit = JSON.stringify(resolvedBody);
        } else if (contentType === 'application/x-www-form-urlencoded') {
          bodyInit = new URLSearchParams(resolvedBody as Record<string, string>).toString();
        } else {
          bodyInit = JSON.stringify(resolvedBody);
        }
      }

      const maxRetries = config.retryCount || 0;
      let lastError: unknown;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, config.retryDelay || 1000));
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), config.timeout || 30000);

        try {
          const response = await fetch(resolvedUrl, {
            method: config.method || 'POST',
            headers: { 'Content-Type': contentType, ...resolvedHeaders },
            body: bodyInit,
            signal: controller.signal,
          });

          const text = await response.text();
          let data: unknown = text;
          try { data = JSON.parse(text); } catch { /* keep as text */ }

          // 判断成功条件
          let success = response.ok;
          if (config.successCondition) {
            if (config.successCondition.type === 'status_code') {
              const statusStr = String(response.status);
              success = config.successCondition.operator === 'equals'
                ? statusStr === config.successCondition.value
                : config.successCondition.operator === 'contains'
                  ? statusStr.includes(config.successCondition.value)
                  : new RegExp(config.successCondition.value).test(statusStr);
            } else {
              const jpVal = getJsonPath(data, config.successCondition.value);
              const jpStr = jpVal !== undefined ? String(jpVal) : '';
              success = config.successCondition.operator === 'equals'
                ? jpStr === config.successCondition.value
                : config.successCondition.operator === 'contains'
                  ? jpStr.includes(config.successCondition.value)
                  : new RegExp(config.successCondition.value).test(jpStr);
            }
          }

          return { success, statusCode: response.status, statusText: response.statusText, data };
        } catch (err) {
          lastError = err;
          if (attempt === maxRetries) throw err;
        } finally {
          clearTimeout(timeout);
        }
      }
      throw lastError;
    }

    case 'notification': {
      const config = step.config as {
        urls: string[]; title?: string; content?: string;
        type?: 'info' | 'success' | 'warning' | 'failure';
      };

      const resolvedTitle = config.title ? resolveTemplate(config.title, variables) : undefined;
      const resolvedBody = resolveTemplate(config.content || '', variables);

      const results = await sendNotification({
        urls: config.urls,
        title: resolvedTitle,
        body: resolvedBody,
        type: config.type,
      });

      return { success: results.every((r) => r.success), results };
    }

    case 'ai_digest': {
      const config = step.config as {
        provider: string; model: string; apiKey: string; baseUrl?: string;
        prompt: string; inputSource?: { stepId?: string; path?: string };
        maxTokens?: number; temperature?: number; outputKey?: string;
      };

      const resolvedPrompt = resolveTemplate(config.prompt, variables);

      let inputContent = '';
      if (config.inputSource) {
        const sourceData = config.inputSource.stepId
          ? variables[config.inputSource.stepId] : variables;
        const extracted = config.inputSource.path
          ? getJsonPath(sourceData, config.inputSource.path) : sourceData;
        inputContent = JSON.stringify(extracted);
      }

      const apiUrl = config.baseUrl;
      if (!apiUrl) throw new Error('AI digest 缺少 baseUrl');

      const body = {
        model: config.model,
        messages: [
          { role: 'system', content: resolvedPrompt },
          ...(inputContent ? [{ role: 'user', content: inputContent }] : []),
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return { success: response.ok, provider: config.provider, model: config.model, data, outputKey: config.outputKey };
    }

    default:
      throw new Error(`未知的操作类型: ${step.type}`);
  }
}
