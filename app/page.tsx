// app/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Tabs, Button, Table, Tag, Space, Popconfirm, message, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function Home() {
  const [tab, setTab] = useState('rules');
  const [rules, setRules] = useState<{ items: unknown[]; total: number }>({ items: [], total: 0 });
  const [actions, setActions] = useState<{ items: unknown[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try { setRules(await api.getRules()); } catch { message.error('获取规则列表失败'); }
    finally { setLoading(false); }
  }, []);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try { setActions(await api.getActions()); } catch { message.error('获取操作列表失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRules(); fetchActions(); }, [fetchRules, fetchActions]);

  const columns = tab === 'rules' ? [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string, r: Record<string, unknown>) => <Link href={`/rules/${r._id}`}>{v}</Link> },
    { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80 },
    { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '禁用'}</Tag> },
    { title: '标签', dataIndex: 'tags', key: 'tags', render: (v: string[]) => v?.map(t => <Tag key={t}>{t}</Tag>) },
    { title: '操作', key: 'op', width: 180, render: (_: unknown, r: Record<string, unknown>) => (
      <Space>
        <Link href={`/rules/${r._id}`}><Button size="small" icon={<EditOutlined />}>编辑</Button></Link>
        <Popconfirm title="确定删除?" onConfirm={async () => { await api.deleteRule(r._id as string); fetchRules(); message.success('已删除'); }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ] : [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string, r: Record<string, unknown>) => <Link href={`/actions/${r._id}`}>{v}</Link> },
    { title: '步骤数', key: 'steps', width: 80, render: (_: unknown, r: Record<string, unknown>) => (r.steps as unknown[])?.length || 0 },
    { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 80, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '禁用'}</Tag> },
    { title: '标签', dataIndex: 'tags', key: 'tags', render: (v: string[]) => v?.map(t => <Tag key={t}>{t}</Tag>) },
    { title: '操作', key: 'op', width: 180, render: (_: unknown, r: Record<string, unknown>) => (
      <Space>
        <Link href={`/actions/${r._id}`}><Button size="small" icon={<EditOutlined />}>编辑</Button></Link>
        <Popconfirm title="确定删除?" onConfirm={async () => { await api.deleteAction(r._id as string); fetchActions(); message.success('已删除'); }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <Typography.Title level={3}>My Webhook App</Typography.Title>
      <Tabs activeKey={tab} onChange={setTab} tabBarExtraContent={
        <Link href={tab === 'rules' ? '/rules/new' : '/actions/new'}>
          <Button type="primary" icon={<PlusOutlined />}>新建{tab === 'rules' ? '规则' : '操作'}</Button>
        </Link>
      } items={[
        { key: 'rules', label: '规则', children: <Table rowKey="_id" dataSource={rules.items} columns={columns as never} loading={loading} /> },
        { key: 'actions', label: '操作任务', children: <Table rowKey="_id" dataSource={actions.items} columns={columns as never} loading={loading} /> },
      ]} />
    </div>
  );
}
