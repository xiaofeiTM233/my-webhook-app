// app/api/rules/[id]/route.ts
import dbConnect from '@/lib/db';
import Rule from '@/models/Rule';
import { NextRequest, NextResponse } from 'next/server';

/** 获取单条规则详情 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const rule = await Rule.findById(id).populate('actionIds').lean();
    if (!rule) {
      return NextResponse.json({ success: false, error: '规则不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}

/** 更新规则 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const data = body.rawJson ? { ...body.rawJson, rawJson: body.rawJson } : body;

    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;
    const rule = await Rule.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate('actionIds');

    if (!rule) {
      return NextResponse.json({ success: false, error: '规则不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}

/** 删除规则 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const rule = await Rule.findByIdAndDelete(id);
    if (!rule) {
      return NextResponse.json({ success: false, error: '规则不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}

/** 切换启用/禁用状态 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ success: false, error: 'enabled 必须为布尔值' }, { status: 400 });
    }

    const rule = await Rule.findByIdAndUpdate(
      id,
      { $set: { enabled: body.enabled } },
      { new: true }
    );

    if (!rule) {
      return NextResponse.json({ success: false, error: '规则不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}
