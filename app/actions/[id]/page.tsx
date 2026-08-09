// app/actions/[id]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Form, Input, Switch, Select, Button, Space, message, Typography, Divider, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import Link from 'next/link';

const STEP_TYPE_OPTIONS = [
  { label: 'Webhook 请求', value: 'webhook' },
  { label: '通知', value: 'notification' },
  { label: 'AI Digest', value: 'ai_digest' },
];

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(v => ({ label: v, value: v }));

const NOTIFY_TYPE_OPTIONS = [
  { label: 'info', value: 'info' }, { label: 'success', value: 'success' },
  { label: 'warning', value: 'warning' }, { label: 'failure', value: 'failure' },
];

export default function ActionEdit() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api.getAction(id).then((data) => { form.setFieldsValue(data); setLoading(false); }).catch(() => setLoading(false));
  }, [id, isNew, form]);

  const onFinish = async (values: Record<string, unknown>) => {
    try {
      if (isNew) {
        await api.createAction(values);
        message.success('创建成功');
      } else {
        await api.updateAction(id, values);
        message.success('更新成功');
      }
      router.push('/');
    } catch (err) { message.error((err as Error).message); }
  };

  const stepType = Form.useWatch(['steps'], form);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <Link href="/"><Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>返回</Button></Link>
      <Typography.Title level={4}>{isNew ? '新建操作任务' : '编辑操作任务'}</Typography.Title>
      <Card loading={!isNew && loading}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ enabled: true, steps: [], tags: [] }}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input placeholder="操作任务名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space>
            <Form.Item name="enabled" label="启用" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="globalTimeout" label="全局超时(ms)">
              <InputNumber min={0} placeholder="不限制" />
            </Form.Item>
          </Space>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签" />
          </Form.Item>

          <Divider>步骤</Divider>
          <Form.List name="steps">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => {
                  const step = stepType?.[name];
                  return (
                    <Card key={key} size="small" style={{ marginBottom: 12 }} extra={<Button icon={<DeleteOutlined />} onClick={() => remove(name)} danger size="small" />}>
                      <Space wrap align="start">
                        <Form.Item name={[name, 'stepId']} label="步骤ID" rules={[{ required: true }]}>
                          <Input placeholder="唯一标识" style={{ width: 120 }} />
                        </Form.Item>
                        <Form.Item name={[name, 'name']} label="名称" rules={[{ required: true }]}>
                          <Input placeholder="步骤名称" style={{ width: 140 }} />
                        </Form.Item>
                        <Form.Item name={[name, 'type']} label="类型" rules={[{ required: true }]}>
                          <Select options={STEP_TYPE_OPTIONS} style={{ width: 130 }} />
                        </Form.Item>
                        <Form.Item name={[name, 'order']} label="顺序" rules={[{ required: true }]}>
                          <InputNumber min={0} />
                        </Form.Item>
                        <Form.Item name={[name, 'enabled']} label="启用" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                        <Form.Item name={[name, 'continueOnError']} label="失败继续" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Space>

                      {step?.type === 'webhook' && (
                        <>
                          <Form.Item name={[name, 'config', 'url']} label="URL" rules={[{ required: true }]}>
                            <Input placeholder="https://example.com/api" />
                          </Form.Item>
                          <Space>
                            <Form.Item name={[name, 'config', 'method']} label="方法">
                              <Select options={METHOD_OPTIONS} style={{ width: 100 }} />
                            </Form.Item>
                            <Form.Item name={[name, 'config', 'timeout']} label="超时(ms)">
                              <InputNumber min={0} placeholder="30000" />
                            </Form.Item>
                            <Form.Item name={[name, 'config', 'retryCount']} label="重试次数">
                              <InputNumber min={0} />
                            </Form.Item>
                          </Space>
                          <Form.Item name={[name, 'config', 'body']} label="Body (JSON)">
                            <Input.TextArea rows={4} placeholder='{"key": "value"}' />
                          </Form.Item>
                        </>
                      )}

                      {step?.type === 'notification' && (
                        <>
                          <Form.Item name={[name, 'config', 'urls']} label="Apprise URLs" rules={[{ required: true }]}>
                            <Select mode="tags" placeholder="discord://..., slack://..." />
                          </Form.Item>
                          <Form.Item name={[name, 'config', 'title']} label="标题">
                            <Input placeholder="通知标题" />
                          </Form.Item>
                          <Form.Item name={[name, 'config', 'content']} label="内容">
                            <Input.TextArea rows={3} placeholder="通知内容，支持 {{var}} 模板" />
                          </Form.Item>
                          <Form.Item name={[name, 'config', 'type']} label="类型">
                            <Select options={NOTIFY_TYPE_OPTIONS} style={{ width: 120 }} allowClear />
                          </Form.Item>
                        </>
                      )}

                      {step?.type === 'ai_digest' && (
                        <>
                          <Form.Item name={[name, 'config', 'baseUrl']} label="API 地址" rules={[{ required: true }]}>
                            <Input placeholder="https://api.openai.com/v1/chat/completions" />
                          </Form.Item>
                          <Space>
                            <Form.Item name={[name, 'config', 'model']} label="模型" rules={[{ required: true }]}>
                              <Input placeholder="gpt-4o" style={{ width: 160 }} />
                            </Form.Item>
                            <Form.Item name={[name, 'config', 'apiKey']} label="API Key" rules={[{ required: true }]}>
                              <Input.Password placeholder="sk-..." style={{ width: 200 }} />
                            </Form.Item>
                          </Space>
                          <Form.Item name={[name, 'config', 'prompt']} label="提示词" rules={[{ required: true }]}>
                            <Input.TextArea rows={4} placeholder="系统提示词，支持 {{var}} 模板" />
                          </Form.Item>
                          <Space>
                            <Form.Item name={[name, 'config', 'maxTokens']} label="Max Tokens">
                              <InputNumber min={1} />
                            </Form.Item>
                            <Form.Item name={[name, 'config', 'temperature']} label="温度">
                              <InputNumber min={0} max={2} step={0.1} />
                            </Form.Item>
                            <Form.Item name={[name, 'config', 'outputKey']} label="输出变量">
                              <Input placeholder="ai_result" />
                            </Form.Item>
                          </Space>
                        </>
                      )}
                    </Card>
                  );
                })}
                <Button type="dashed" onClick={() => add({ order: fields.length, enabled: true, continueOnError: false })} icon={<PlusOutlined />} block>
                  添加步骤
                </Button>
              </>
            )}
          </Form.List>

          <Divider />
          <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
        </Form>
      </Card>
    </div>
  );
}
