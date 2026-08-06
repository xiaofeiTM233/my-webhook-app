// models/Rule.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

// 匹配条件类型定义

/** 匹配运算符 */
export type MatchOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'exists'
  | 'not_exists'
  | 'in'
  | 'not_in'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte';

/** 单个匹配条件 */
export interface IMatchCondition {
  field: 'path' | 'method' | 'host' | 'source_ip' | 'query' | 'header' | 'body';
  operator: MatchOperator;
  key?: string;
  value?: string | number | boolean | string[] | number[];
}

/** 条件组合 */
export interface IConditionGroup {
  logic: 'AND' | 'OR';
  conditions: IMatchCondition[];
  groups?: IConditionGroup[];
}

// 参数传递定义

/** 参数传递映射 */
export interface IParameterMapping {
  name: string;
  source: 'match_target' | 'query' | 'header' | 'body_json' | 'static';
  sourcePath?: string;
  staticValue?: string;
}

// Rule 文档接口
export interface IRule {
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  conditionGroup: IConditionGroup;
  actionIds: mongoose.Types.ObjectId[];
  parameterMappings?: IParameterMapping[];
  rawJson?: Record<string, unknown>;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface IRuleDocument extends IRule, Document {}

// Schema 定义
const MatchConditionSchema = new Schema<IMatchCondition>(
  {
    field: {
      type: String,
      required: true,
      enum: ['path', 'method', 'host', 'source_ip', 'query', 'header', 'body'],
    },
    operator: {
      type: String,
      required: true,
      enum: [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'starts_with',
        'ends_with',
        'regex',
        'exists',
        'not_exists',
        'in',
        'not_in',
        'gt',
        'gte',
        'lt',
        'lte',
      ],
    },
    key: { type: String },
    value: {
      type: Schema.Types.Mixed,
      validate: {
        validator(this: IMatchCondition, v: unknown) {
          if (this.operator === 'in' || this.operator === 'not_in') return Array.isArray(v);
          return true;
        },
        message: 'in/not_in 运算符要求 value 为数组',
      },
    },
  },
  { _id: false }
);

// ConditionGroup 递归引用自身
const ConditionGroupSchema = new Schema<IConditionGroup>(
  {
    logic: { type: String, required: true, enum: ['AND', 'OR'], default: 'AND' },
    conditions: { type: [MatchConditionSchema], default: [] },
  },
  { _id: false }
);
ConditionGroupSchema.add({ groups: { type: [ConditionGroupSchema], default: [] } });

const ParameterMappingSchema = new Schema<IParameterMapping>(
  {
    name: { type: String, required: true },
    source: {
      type: String,
      required: true,
      enum: ['match_target', 'query', 'header', 'body_json', 'static'],
    },
    sourcePath: { type: String },
    staticValue: { type: String },
  },
  { _id: false }
);

const RuleSchema = new Schema<IRuleDocument>(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    enabled: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 0, index: true },
    conditionGroup: { type: ConditionGroupSchema, required: true },
    actionIds: [{ type: Schema.Types.ObjectId, ref: 'Action' }],
    parameterMappings: { type: [ParameterMappingSchema], default: [] },
    rawJson: { type: Schema.Types.Mixed },
    tags: { type: [String], index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'rules',
  }
);

// 复合索引 — 按优先级 + 是否启用排序
RuleSchema.index({ priority: 1, enabled: 1 });

// 文本索引 — 支持名称和描述搜索
RuleSchema.index({ name: 'text', description: 'text' });

const Rule: Model<IRuleDocument> =
  mongoose.models.Rule || mongoose.model<IRuleDocument>('Rule', RuleSchema);

export default Rule;
