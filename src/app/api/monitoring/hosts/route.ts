import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ hosts: [], sources: 0 })
}
