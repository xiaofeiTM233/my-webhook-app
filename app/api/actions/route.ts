// app/api/actions/route.ts
import dbConnect from '@/lib/db';
import Action from '@/models/Action';
import { NextRequest, NextResponse } from 'next/server';

const MAX_LIMIT = 100;

/** 获取操作任务列表 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const enabled = searchParams.get('enabled');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');

    const filter: Record<string, unknown> = {};
    if (enabled === 'true') filter.enabled = true;
    else if (enabled === 'false') filter.enabled = false;
    if (tag) filter.tags = tag;
    if (search) filter.$text = { $search: search };

    const [actions, total] = await Promise.all([
      Action.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Action.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, data: { items: actions, total, page, limit } });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}

/** 创建操作任务 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    delete body._id;
    delete body.createdAt;
    delete body.updatedAt;

    const action = await Action.create(body);
    return NextResponse.json({ success: true, data: action }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}
