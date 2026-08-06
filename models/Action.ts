// models/Action.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

// Action 操作步骤定义

/** 操作类型 */
export type ActionStepType = 'webhook' | 'notification' | 'ai_digest';

/** HTTP 请求方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** 变量引用 */
export interface IVariableRef {
  type: 'step_output' | 'rule_param' | 'static' | 'env';
  stepId?: string;
  path?: string;
  staticValue?: string;
  envKey?: string;
}

// 各操作类型的配置

/** Webhook 请求操作 */
export interface IWebhookAction {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  contentType?: 'application/json' | 'application/x-www-form-urlencoded' | 'multipart/form-data';
  timeout?: number;
  successCondition?: {
    type: 'status_code' | 'json_path';
    operator: 'equals' | 'contains' | 'regex';
    value: string;
  };
  retryCount?: number;
  retryDelay?: number;
}

/** 通知操作 */
export interface INotificationAction {
  urls: string[];
  title?: string;
  content?: string;
  type?: 'info' | 'success' | 'warning' | 'failure';
}

/** AI Digest 操作 */
export interface IAIDigestAction {
  provider: 'custom';
  model: string;
  apiKey: string;
  baseUrl?: string;
  prompt: string;
  inputSource: IVariableRef;
  maxTokens?: number;
  temperature?: number;
  outputKey?: string;
}

// Action Step

export interface IActionStep {
  stepId: string;
  name: string;
  type: ActionStepType;
  enabled: boolean;
  order: number;
  config: IWebhookAction | INotificationAction | IAIDigestAction;
  dependsOn?: string[];
  condition?: {
    stepId: string;
    jsonPath: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'exists';
    value?: string;
  };
  timeout?: number;
  continueOnError?: boolean;
}

// Action 文档接口

export interface IAction {
  name: string;
  description?: string;
  enabled: boolean;
  steps: IActionStep[];
  globalTimeout?: number;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier?: number;
  };
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IActionDocument extends IAction, Document {}

// Schema 定义
const ActionStepSchema = new Schema<IActionStep>(
  {
    stepId: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['webhook', 'notification', 'ai_digest'],
    },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true },
    config: { type: Schema.Types.Mixed, required: true },
    dependsOn: { type: [String], default: [] },
    condition: {
      type: new Schema(
        {
          stepId: { type: String, required: true },
          jsonPath: { type: String, required: true },
          operator: {
            type: String,
            required: true,
            enum: ['equals', 'not_equals', 'contains', 'exists'],
          },
          value: { type: String },
        },
        { _id: false }
      ),
    },
    timeout: { type: Number },
    continueOnError: { type: Boolean, default: false },
  },
  { _id: false }
);

const ActionSchema = new Schema<IActionDocument>(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    enabled: { type: Boolean, default: true, index: true },
    steps: { type: [ActionStepSchema], default: [] },
    globalTimeout: { type: Number },
    retryPolicy: {
      type: new Schema(
        {
          maxRetries: { type: Number, required: true },
          retryDelay: { type: Number, required: true },
          backoffMultiplier: { type: Number, default: 1 },
        },
        { _id: false }
      ),
    },
    tags: { type: [String], index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'actions',
  }
);

// 文本索引 — 支持名称和描述搜索
ActionSchema.index({ name: 'text', description: 'text' });

const Action: Model<IActionDocument> =
  mongoose.models.Action || mongoose.model<IActionDocument>('Action', ActionSchema);

export default Action;
