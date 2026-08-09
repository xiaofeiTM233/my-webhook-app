// app/rules/[id]/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Form, Input, InputNumber, Switch, Select, Button, message, Typography, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import Link from 'next/link';

const FIELD_OPTIONS = [
  { label: '路径', value: 'path' }, { label: '方法', value: 'method' },
  { label: 'Host', value: 'host' }, { label: '源IP', value: 'source_ip' },
  { label: '查询字符串', value: 'query' }, { label: 'Header', value: 'header' },
  { label: 'Body', value: 'body' },
];

const OPERATOR_OPTIONS = [
  { label: '等于', value: 'equals' }, { label: '不等于', value: 'not_equals' },
  { label: '包含', value: 'contains' }, { label: '不包含', value: 'not_contains' },
  { label: '开头是', value: 'starts_with' }, { label: '结尾是', value: 'ends_with' },
  { label: '正则', value: 'regex' }, { label: '存在', value: 'exists' },
  { label: '不存在', value: 'not_exists' }, { label: '在列表中', value: 'in' },
  { label: '不在列表中', value: 'not_in' }, { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' }, { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
];

export default function RuleEdit() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<Array<{ _id: string; name: string }>>([]);

  const fetchActions = useCallback(async () => {
    try { const data = await api.getActions(); setActions(data.items as never[]); } catch { /* empty */ }
  }, []);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api.getRule(id).then((data) => { form.setFieldsValue(data); setLoading(false); }).catch(() => setLoading(false));
  }, [id, isNew, form]);

  const onFinish = async (values: Record<string, unknown>) => {
    try {
      if (isNew) {
        await api.createRule(values);
        message.success('创建成功');
      } else {
        await api.updateRule(id, values);
        message.success('更新成功');
      }
      router.push('/');
    } catch (err) { message.error((err as Error).message); }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <Link href="/"><Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>返回</Button></Link>
      <Typography.Title level={4}>{isNew ? '新建规则' : '编辑规则'}</Typography.Title>
      <Card loading={!isNew && loading}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ enabled: true, priority: 0, conditionGroup: { logic: 'AND', conditions: [] }, parameterMappings: [], actionIds: [], tags: [] }}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="规则名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space>
            <Form.Item name="enabled" label="启用" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="priority" label="优先级">
              <InputNumber min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签" />
          </Form.Item>

          <Divider>匹配条件</Divider>
          <Form.Item name={['conditionGroup', 'logic']} label="逻辑">
            <Select options={[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]} style={{ width: 100 }} />
          </Form.Item>
          <Form.List name={['conditionGroup', 'conditions']}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <div key={key} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 8 }}>
                    <Form.Item name={[name, 'field']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <Select options={FIELD_OPTIONS} placeholder="字段" style={{ width: 110 }} />
                    </Form.Item>
                    <Form.Item name={[name, 'operator']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <Select options={OPERATOR_OPTIONS} placeholder="运算符" style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item name={[name, 'key']} style={{ marginBottom: 0 }}>
                      <Input placeholder="key(可选)" style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item name={[name, 'value']} style={{ marginBottom: 0 }}>
                      <Input placeholder="值" style={{ width: 160 }} />
                    </Form.Item>
                    <Button icon={<DeleteOutlined />} onClick={() => remove(name)} danger />
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>添加条件</Button>
              </>
            )}
          </Form.List>

          <Divider>关联操作</Divider>
          <Form.Item name="actionIds" label="选择操作任务">
            <Select mode="multiple" placeholder="选择要触发的操作任务" options={actions.map(a => ({ label: a.name, value: String(a._id) }))} />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
        </Form>
      </Card>
    </div>
  );
}
