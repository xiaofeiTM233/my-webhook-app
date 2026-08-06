// app/api/actions/[id]/route.ts
import dbConnect from '@/lib/db';
import Action from '@/models/Action';
import { NextRequest, NextResponse } from 'next/server';

/** 获取单条操作任务详情 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const action = await Action.findById(id).lean();
    if (!action) {
      return NextResponse.json({ success: false, error: '操作任务不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: action });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}

/** 更新操作任务 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    delete body._id;
    delete body.createdAt;
    delete body.updatedAt;

    const action = await Action.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!action) {
      return NextResponse.json({ success: false, error: '操作任务不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: action });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}

/** 删除操作任务 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const action = await Action.findByIdAndDelete(id);
    if (!action) {
      return NextResponse.json({ success: false, error: '操作任务不存在' }, { status: 404 });
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

    const action = await Action.findByIdAndUpdate(
      id,
      { $set: { enabled: body.enabled } },
      { new: true }
    );

    if (!action) {
      return NextResponse.json({ success: false, error: '操作任务不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: action });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }
}
