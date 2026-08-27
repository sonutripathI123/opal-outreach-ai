import { NextRequest, NextResponse } from 'next/server';
import { AIClient } from '@/lib/ai/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let { apiKey, model } = await req.json().catch(() => ({ apiKey: null, model: null }));
    
    if (!apiKey) {
      apiKey = await AIClient.getApiKey();
    }

    if (!apiKey || apiKey.trim() === '' || apiKey.includes('••••') || apiKey === 'your-anthropic-claude-api-key-here') {
      return NextResponse.json({
        success: false,
        error: 'No valid Anthropic Claude API Key found. Please provide an active key starting with sk-ant-api...',
      }, { status: 400 });
    }

    const testModel = model || process.env.AI_MODEL_PRIMARY || 'claude-3-5-sonnet-20241022';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: testModel,
        messages: [{ role: 'user', content: 'Say "Opal Outreach AI connected successfully" in 5 words.' }],
        max_tokens: 20,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        statusCode: res.status,
        error: data.error?.message || 'Failed to authenticate with Anthropic Claude API.',
      }, { status: res.status });
    }

    const replyText = data.content?.[0]?.text || '';

    return NextResponse.json({
      success: true,
      message: 'Claude API key is valid and connected successfully!',
      model: testModel,
      claudeResponse: replyText,
      usage: data.usage,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error testing Claude API',
    }, { status: 500 });
  }
}
