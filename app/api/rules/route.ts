// app/api/rules/route.ts
import dbConnect from '@/lib/db';
import Rule from '@/models/Rule';
import { NextRequest, NextResponse } from 'next/server';

const MAX_LIMIT = 100;

/** 获取规则列表 */
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

    const [rules, total] = await Promise.all([
      Rule.find(filter)
        .sort({ priority: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actionIds')
        .lean(),
      Rule.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, data: { items: rules, total, page, limit } });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}

/** 创建规则 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    const data = body.rawJson ? { ...body.rawJson, rawJson: body.rawJson } : body;

    // 防止注入敏感字段
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;
    const rule = await Rule.create(data);
    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}
