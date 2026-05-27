import { NextResponse } from 'next/server';
import { shootRtoEmailAlert } from '@/src/services/emailService';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Clear from notified registry first to guarantee sending
  const logFilePath = path.join(process.cwd(), 'src/services/rto_notified_orders.json');
  try {
    if (fs.existsSync(logFilePath)) {
      const list = JSON.parse(fs.readFileSync(logFilePath, 'utf-8'));
      const filtered = list.filter((id: string) => id !== 'test_1001');
      fs.writeFileSync(logFilePath, JSON.stringify(filtered, null, 2), 'utf-8');
    }
  } catch (e) {
    console.warn('⚠️ Registry reset skipped during test trigger:', e);
  }

  const testOrder = {
    id: 'test_1001',
    name: '#TEST-1001',
    created_at: new Date().toISOString(),
    financial_status: 'paid',
    fulfillment_status: 'fulfilled',
    total_price: '2499.00',
    customer: {
      first_name: 'Yash',
      last_name: 'Srivastava',
      email: 'yash@agvahealthtech.com',
      phone: '9999999999',
    },
    shipping_address: {
      first_name: 'Yash',
      last_name: 'Srivastava',
      address1: 'Plot 42, Sector 12',
      address2: 'Agva Health Tech Offices',
      city: 'Noida',
      province: 'Uttar Pradesh',
      zip: '201301',
      phone: '9999999999',
    },
    line_items: [
      {
        sku: 'FF-DB-5KG',
        title: 'Fiberise Ergonomic Dumbbells 5kg',
        quantity: 1,
        price: '2499.00',
      }
    ],
    fulfillments: [
      {
        tracking_number: 'SRTEST8392102',
        tracking_company: 'Delhivery Surface',
        tracking_url: 'https://track.shiprocket.in/SRTEST8392102',
        shipment_status: 'rto',
        created_at: new Date().toISOString(),
      }
    ]
  };

  try {
    const success = await shootRtoEmailAlert(testOrder);
    return NextResponse.json({ 
      success, 
      message: success 
        ? 'RTO Trial Email successfully compiled and dispatched.' 
        : 'RTO Trial Email was skipped (already notified).' 
    });
  } catch (err: any) {
    console.error('💥 Failed to trigger trial RTO email:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
