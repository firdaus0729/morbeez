/** Rich demo payloads when API data is sparse — matches CRM mockups */

export const DEMO_INTERACTIONS = [
  { atLabel: '23 May 2024, 4:30 PM', type: 'call', typeLabel: 'Call', icon: 'phone', by: 'Jithin Varghese', role: 'Telecaller', summary: 'Discussed nutrient deficiency and recommended foliar spray.', nextAction: 'Follow-up after 2 days', nextDate: '25 May 2024', status: 'Completed', statusTone: 'success', block: 'Block A' },
  { atLabel: '22 May 2024, 11:15 AM', type: 'whatsapp', typeLabel: 'WhatsApp', icon: 'whatsapp', by: 'Jithin Varghese', role: 'Telecaller', summary: 'Shared product brochure and pricing for Potassium Nitrate.', nextAction: '—', nextDate: '', status: 'Sent', statusTone: 'info', block: '—' },
  { atLabel: '21 May 2024, 3:00 PM', type: 'recommendation', typeLabel: 'Recommendation', icon: 'ai', by: 'Arjun Nair', role: 'Agronomist', summary: 'AI + agronomist recommendation for calcium correction on Block A.', nextAction: 'Monitor in 7 days', nextDate: '28 May 2024', status: 'Active', statusTone: 'info', block: 'Block A' },
  { atLabel: '20 May 2024, 9:00 AM', type: 'lead', typeLabel: 'Lead Created', icon: 'users', by: 'System', role: 'Automated', summary: 'Lead created from inbound call referral.', nextAction: 'Initial call', nextDate: '20 May 2024', status: 'Completed', statusTone: 'success', block: '—' },
  { atLabel: '19 May 2024, 2:45 PM', type: 'follow_up', typeLabel: 'Follow-up', icon: 'phone', by: 'Jithin Varghese', role: 'Telecaller', summary: 'Farmer confirmed interest in drip nutrition schedule.', nextAction: 'Send quote', nextDate: '22 May 2024', status: 'Pending', statusTone: 'warning', block: '—' },
  { atLabel: '18 May 2024, 5:20 PM', type: 'order', typeLabel: 'Order', icon: 'orders', by: 'System', role: 'Automated', summary: 'Order ORD-10987 placed — Potassium Nitrate 13:0:45 (10kg).', nextAction: 'Delivery tracking', nextDate: '24 May 2024', status: 'Delivered', statusTone: 'success', block: 'Block A' },
  { atLabel: '17 May 2024, 10:30 AM', type: 'field', typeLabel: 'Field Visit', icon: 'location', by: 'Arjun Nair', role: 'Agronomist', summary: 'Field visit — yellowing on lower leaves, moderate severity.', nextAction: 'Soil test review', nextDate: '20 May 2024', status: 'Completed', statusTone: 'success', block: 'Block A' },
  { atLabel: '16 May 2024, 1:00 PM', type: 'soil', typeLabel: 'Soil Report Uploaded', icon: 'content', by: 'Arjun Nair', role: 'Agronomist', summary: 'Block_A_Soil_Report.pdf uploaded for Block A.', nextAction: 'Review with farmer', nextDate: '18 May 2024', status: 'Under Review', statusTone: 'review', block: 'Block A' },
  { atLabel: '15 May 2024, 4:00 PM', type: 'reminder', typeLabel: 'Reminder', icon: 'bell', by: 'System', role: 'Automated', summary: 'Reminder: follow-up call scheduled.', nextAction: 'Call farmer', nextDate: '16 May 2024', status: 'Pending', statusTone: 'warning', block: '—' },
  { atLabel: '14 May 2024, 11:30 AM', type: 'ai', typeLabel: 'AI Diagnosis', icon: 'ai', by: 'System', role: 'Automated', summary: 'Leaf spot detected — confidence 87%. Suggested fungicide protocol.', nextAction: 'Agronomist validation', nextDate: '15 May 2024', status: 'Active', statusTone: 'info', block: 'Block B' },
];

export const DEMO_ORDERS = [
  { id: 'ORD-10987', dateLabel: '23 May 2024, 4:30 PM', product: 'Potassium Nitrate 13:0:45 (10kg)', qty: 2, amount: 2840, status: 'Delivered', statusTone: 'success', payment: 'Paid Online (UPI)', deliveryDate: '24 May 2024', deliveryBy: 'BlueDart', block: 'Block A' },
  { id: 'ORD-10912', dateLabel: '15 May 2024, 2:15 PM', product: 'Calcium Nitrate + Boron (5kg)', qty: 1, amount: 1650, status: 'Delivered', statusTone: 'success', payment: 'Paid COD', deliveryDate: '18 May 2024', deliveryBy: 'Delhivery', block: 'Block A' },
  { id: 'ORD-10845', dateLabel: '02 May 2024, 10:00 AM', product: 'Organic Vermicompost (25kg)', qty: 3, amount: 4200, status: 'Shipped', statusTone: 'info', payment: 'Paid Online (Card)', deliveryDate: '05 May 2024', deliveryBy: 'Shiprocket', block: 'Block B' },
  { id: 'ORD-10790', dateLabel: '20 Apr 2024, 3:45 PM', product: 'Fungicide — Mancozeb 75% WP', qty: 1, amount: 890, status: 'Processing', statusTone: 'warning', payment: 'Pending', deliveryDate: '—', deliveryBy: '—', block: 'Block A' },
  { id: 'ORD-10701', dateLabel: '05 Apr 2024, 9:30 AM', product: 'Micronutrient Mix (1L)', qty: 2, amount: 1180, status: 'Cancelled', statusTone: 'danger', payment: 'Refunded Online (Card)', deliveryDate: '—', deliveryBy: '—', block: '—' },
];

export const DEMO_BLOCKS = [
  { id: 'a', name: 'Block A', crop: 'Banana', acre: '2.1 Acre', variety: 'Nendran', soilHealth: 'Good', soilTone: 'success', lastVisit: '23 May 2024' },
  { id: 'b', name: 'Block B', crop: 'Pepper', acre: '1.5 Acre', variety: 'Panniyur-1', soilHealth: 'Medium', soilTone: 'warning', lastVisit: '18 May 2024' },
  { id: 'c', name: 'Block C', crop: 'Paddy', acre: '2.0 Acre', variety: 'Jyothi', soilHealth: 'Critical', soilTone: 'danger', lastVisit: '10 May 2024' },
];

export const DEMO_AGRONOMIST = {
  name: 'Arjun Nair',
  employeeId: 'AGRO-1001',
  mobile: '+91 98765 43211',
  email: 'arjun.nair@morbeez.com',
  specialization: 'Soil Nutrition, Banana, Pepper',
  assignedSince: '10 May 2024',
  assignedBlocks: 'Block A, Block B',
  lastReview: '23 May 2024, 4:30 PM',
  nextVisit: '26 May 2024',
  activities: [
    { date: '23 May 2024', activity: 'Field Visit', activityTone: 'success', block: 'Block A', notes: 'Leaf yellowing observed in banana. Moderate severity.' },
    { date: '20 May 2024', activity: 'Recommendation Shared', activityTone: 'info', block: 'Block A', notes: 'Potassium correction foliar schedule shared.' },
    { date: '18 May 2024', activity: 'Soil Review', activityTone: 'info', block: 'Block B', notes: 'pH 6.2 — lime application suggested.' },
    { date: '15 May 2024', activity: 'Disease Inspection', activityTone: 'warning', block: 'Block A', notes: 'Early leaf spot — monitoring advised.' },
  ],
  blocks: [
    { block: 'Block A', crop: 'Banana', area: '2.1 Acre', status: 'Healthy', statusTone: 'success' },
    { block: 'Block B', crop: 'Pepper', area: '1.5 Acre', status: 'Under Monitoring', statusTone: 'warning' },
  ],
  performance: [
    { label: 'Total Visits', value: '12', icon: '📅' },
    { label: 'Recommendations Given', value: '18', icon: '📋' },
    { label: 'Active Follow-ups', value: '5', icon: '✓' },
    { label: 'Recovery Success Rate', value: '92%', icon: '📈' },
  ],
};

export function enrichLeadData(data) {
  if (!data) return data;
  return {
    ...data,
    interactions: data.interactions?.length >= 5 ? data.interactions : mapTimelineToInteractions(data.timeline),
    ordersDetailed: data.ordersDetailed?.length ? data.ordersDetailed : DEMO_ORDERS,
    agronomist: data.agronomist || DEMO_AGRONOMIST,
    blocks: data.blocks?.length ? data.blocks : DEMO_BLOCKS,
    lastOrder: data.lastOrder || {
      product: 'Potassium Nitrate 13:0:45 (10kg)',
      qty: '2 bags',
      date: '23 May 2024',
      amount: 2840,
      status: 'Delivered',
    },
    farmerProfile: {
      fatherName: 'Kumar Swamy',
      whatsapp: data.farmer?.phone,
      email: '—',
      village: data.lead?.district || 'Wayanad',
      pincode: '673121',
      farmSize: data.farmer?.farmSize || 'Medium (5.6 acres)',
      irrigation: data.farmer?.irrigation || 'Drip',
      ...data.farmerProfile,
    },
  };
}

function mapTimelineToInteractions(timeline) {
  if (!timeline?.length) return DEMO_INTERACTIONS;
  return timeline.map((t, i) => ({
    atLabel: t.atLabel,
    type: t.type,
    typeLabel: t.title,
    icon: t.type === 'whatsapp' ? 'whatsapp' : t.type === 'call' ? 'phone' : 'ai',
    by: 'Staff',
    role: 'Telecaller',
    summary: t.detail || t.title,
    nextAction: '—',
    nextDate: '',
    status: 'Completed',
    statusTone: 'success',
    block: i % 2 === 0 ? 'Block A' : '—',
  }));
}
