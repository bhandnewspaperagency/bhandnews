export interface Hawker {
  id: number;
  name: string;
  contact: string;
  area: string;
  paymentType: 'Cash' | 'UPI' | 'Credit';
  status: 'Active' | 'Inactive';
  joinDate: string;
}

export interface BillingEntry {
  srNo: number;
  newspaper: string;
  rate: number;
  supplyQty: number;
  returnQty: number;
  netQty: number;
  total: number;
}

export interface DailyBillingRecord {
  id: string;
  hawkerId: number;
  hawkerName: string;
  date: string;
  entries: BillingEntry[];
  totalBill: number;
  whatsappSent: boolean;
  paymentStatus: 'Pending' | 'Partial' | 'Paid';
  paymentType: 'Cash' | 'UPI' | 'Credit';
}

export interface MonthlyTrackerRow {
  hawkerId: number;
  hawkerName: string;
  newspapers: Record<string, number>;
  grandTotal: number;
}

export const NEWSPAPERS: { name: string; rate: number }[] = [
  { name: 'Lokmat CNX', rate: 3.50 },
  { name: 'Lokmat SSA', rate: 2.50 },
  { name: 'Lokmat L.T.', rate: 2.80 },
  { name: 'Punya', rate: 3.50 },
  { name: 'Deshdoot', rate: 3.50 },
  { name: 'Pudhari', rate: 3.50 },
  { name: 'Navbharat', rate: 3.50 },
  { name: 'Navrashtra', rate: 2.80 },
  { name: 'Samna', rate: 3.20 },
  { name: 'Pratkshya', rate: 3.50 },
  { name: 'Yasho', rate: 4.20 },
  { name: 'Eng Deshdoot', rate: 1.80 },
  { name: 'Chaufer', rate: 4.20 },
  { name: 'Samrat', rate: 4.40 },
];

export const MASTER_DATA: Hawker[] = [
  { id: 1, name: 'AJAY BAGUL', contact: '9876543201', area: 'Nashik Road', paymentType: 'Cash', status: 'Active', joinDate: '2021-03-15' },
  { id: 2, name: 'AJIT BORSE', contact: '9876543202', area: 'Panchavati', paymentType: 'UPI', status: 'Active', joinDate: '2020-07-01' },
  { id: 3, name: 'AMOL SHIMPI', contact: '9876543203', area: 'Cidco', paymentType: 'Cash', status: 'Active', joinDate: '2019-11-10' },
  { id: 4, name: 'ANIL MEHETRE', contact: '9876543204', area: 'Satpur', paymentType: 'Credit', status: 'Active', joinDate: '2022-01-20' },
  { id: 5, name: 'ARUN PATHARIKAR', contact: '9876543205', area: 'Deolali', paymentType: 'Cash', status: 'Active', joinDate: '2020-05-12' },
  { id: 6, name: 'ARUN SHINDE', contact: '9876543206', area: 'Gangapur Road', paymentType: 'UPI', status: 'Active', joinDate: '2021-08-03' },
  { id: 7, name: 'ASHOK AHIRRAO', contact: '9876543207', area: 'Trimbak Road', paymentType: 'Cash', status: 'Active', joinDate: '2019-04-22' },
  { id: 8, name: 'ASHOK NANDGAONKAR', contact: '9876543208', area: 'Nashik Road', paymentType: 'Cash', status: 'Inactive', joinDate: '2020-09-14' },
  { id: 9, name: 'ATUL SHIRODE', contact: '9876543209', area: 'Panchavati', paymentType: 'UPI', status: 'Active', joinDate: '2021-02-28' },
  { id: 10, name: 'AKSHAY SHEVARE', contact: '9876543210', area: 'Cidco', paymentType: 'Cash', status: 'Active', joinDate: '2022-06-17' },
  { id: 11, name: 'ATHARV DARVE', contact: '9876543211', area: 'Satpur', paymentType: 'UPI', status: 'Active', joinDate: '2021-10-05' },
  { id: 12, name: 'ANIL CHAUDHARI', contact: '9876543212', area: 'Deolali', paymentType: 'Credit', status: 'Active', joinDate: '2020-03-18' },
  { id: 13, name: 'BALKRUSHNA NER', contact: '9876543213', area: 'Gangapur Road', paymentType: 'Cash', status: 'Active', joinDate: '2019-07-30' },
  { id: 14, name: 'BALU SURYAWANSHI', contact: '9876543214', area: 'Trimbak Road', paymentType: 'Cash', status: 'Active', joinDate: '2022-04-11' },
  { id: 15, name: 'BAPURAO CHAUDHARI', contact: '9876543215', area: 'Nashik Road', paymentType: 'UPI', status: 'Active', joinDate: '2021-12-01' },
  { id: 16, name: 'BAPURAO KUMBHARDE', contact: '9876543216', area: 'Panchavati', paymentType: 'Cash', status: 'Active', joinDate: '2020-08-25' },
  { id: 17, name: 'BHUSHAN KAMBALE', contact: '9876543217', area: 'Cidco', paymentType: 'Cash', status: 'Active', joinDate: '2021-05-14' },
  { id: 18, name: 'CHANDRAKANT BORSE', contact: '9876543218', area: 'Satpur', paymentType: 'UPI', status: 'Inactive', joinDate: '2019-12-08' },
  { id: 19, name: 'CHANGDEO PAWAR', contact: '9876543219', area: 'Deolali', paymentType: 'Cash', status: 'Active', joinDate: '2022-02-14' },
  { id: 20, name: 'DATTATRAY THAKRE', contact: '9876543220', area: 'Gangapur Road', paymentType: 'Credit', status: 'Active', joinDate: '2021-09-07' },
  { id: 21, name: 'DATTATREY MEHETRE', contact: '9876543221', area: 'Trimbak Road', paymentType: 'Cash', status: 'Active', joinDate: '2020-11-23' },
  { id: 22, name: 'DEELIP BHAND', contact: '9876543222', area: 'Nashik Road', paymentType: 'UPI', status: 'Active', joinDate: '2019-06-15' },
  { id: 23, name: 'DEVIDAS KHALKAR', contact: '9876543223', area: 'Panchavati', paymentType: 'Cash', status: 'Active', joinDate: '2022-07-29' },
  { id: 24, name: 'DINKAR JADHAV', contact: '9876543224', area: 'Cidco', paymentType: 'Cash', status: 'Active', joinDate: '2021-04-03' },
  { id: 25, name: 'DNYANESHWAR SURYAWANSHI', contact: '9876543225', area: 'Satpur', paymentType: 'UPI', status: 'Active', joinDate: '2020-01-19' },
  { id: 26, name: 'DARSHAN GHANSWANT', contact: '9876543226', area: 'Deolali', paymentType: 'Cash', status: 'Active', joinDate: '2021-07-11' },
  { id: 27, name: 'DEVARSHI WALUNJ', contact: '9876543227', area: 'Gangapur Road', paymentType: 'Credit', status: 'Active', joinDate: '2022-03-26' },
  { id: 28, name: 'GANESH GOSAVI', contact: '9876543228', area: 'Trimbak Road', paymentType: 'Cash', status: 'Active', joinDate: '2020-10-08' },
  { id: 29, name: 'HARIDAS BHALKE', contact: '9876543229', area: 'Nashik Road', paymentType: 'UPI', status: 'Active', joinDate: '2019-08-17' },
  { id: 30, name: 'HEMANT HANDOLE', contact: '9876543230', area: 'Panchavati', paymentType: 'Cash', status: 'Active', joinDate: '2021-11-04' },
  { id: 31, name: 'JIVAN WALEKER', contact: '9876543231', area: 'Cidco', paymentType: 'Cash', status: 'Active', joinDate: '2022-05-20' },
  { id: 32, name: 'JAYANT PATIL', contact: '9876543232', area: 'Satpur', paymentType: 'UPI', status: 'Active', joinDate: '2020-02-13' },
  { id: 33, name: 'KIRAN KARJODKAR', contact: '9876543233', area: 'Deolali', paymentType: 'Cash', status: 'Active', joinDate: '2021-06-28' },
  { id: 34, name: 'KUNAL DHATRAK', contact: '9876543234', area: 'Gangapur Road', paymentType: 'Credit', status: 'Active', joinDate: '2019-09-05' },
  { id: 35, name: 'KALYANI CHHALARE', contact: '9876543235', area: 'Trimbak Road', paymentType: 'Cash', status: 'Active', joinDate: '2022-08-16' },
  { id: 36, name: 'GAURAV SHATRIY', contact: '9876543236', area: 'Nashik Road', paymentType: 'UPI', status: 'Active', joinDate: '2021-01-09' },
  { id: 37, name: 'MANGESH DARVE', contact: '9876543237', area: 'Panchavati', paymentType: 'Cash', status: 'Active', joinDate: '2020-06-22' },
  { id: 38, name: 'MAYUR GAIKWAD', contact: '9876543238', area: 'Cidco', paymentType: 'Cash', status: 'Inactive', joinDate: '2019-03-10' },
  { id: 39, name: 'MILIND BAIRAGI', contact: '9876543239', area: 'Satpur', paymentType: 'UPI', status: 'Active', joinDate: '2021-03-31' },
  { id: 40, name: 'MAHENDRA BHAND', contact: '9876543240', area: 'Deolali', paymentType: 'Credit', status: 'Active', joinDate: '2022-09-12' },
  { id: 41, name: 'NARENDRA DANDGAVAL', contact: '9876543241', area: 'Gangapur Road', paymentType: 'Cash', status: 'Active', joinDate: '2020-04-07' },
  { id: 42, name: 'NITIN IGHE', contact: '9876543242', area: 'Trimbak Road', paymentType: 'UPI', status: 'Active', joinDate: '2021-08-19' },
  { id: 43, name: 'PANKAJ KRAJODKAR', contact: '9876543243', area: 'Nashik Road', paymentType: 'Cash', status: 'Active', joinDate: '2019-05-24' },
  { id: 44, name: 'PRASHANT JOSHI', contact: '9876543244', area: 'Panchavati', paymentType: 'Cash', status: 'Active', joinDate: '2022-10-03' },
  { id: 45, name: 'PRASHANT KAPURE', contact: '9876543245', area: 'Cidco', paymentType: 'UPI', status: 'Active', joinDate: '2021-02-15' },
  { id: 46, name: 'PRAVIN CHAUDHARI', contact: '9876543246', area: 'Satpur', paymentType: 'Cash', status: 'Active', joinDate: '2020-07-28' },
  { id: 47, name: 'PRAVIN SONAVANE', contact: '9876543247', area: 'Deolali', paymentType: 'Credit', status: 'Active', joinDate: '2019-10-14' },
  { id: 48, name: 'PRAWIN KARPE', contact: '9876543248', area: 'Gangapur Road', paymentType: 'Cash', status: 'Active', joinDate: '2021-12-22' },
  { id: 49, name: 'RAJENDRA BHAND', contact: '9876543249', area: 'Trimbak Road', paymentType: 'UPI', status: 'Active', joinDate: '2022-06-08' },
  { id: 50, name: 'RAJESH THAKUR', contact: '9876543250', area: 'Nashik Road', paymentType: 'Cash', status: 'Active', joinDate: '2020-09-01' },
  { id: 51, name: 'RAVINDRA DALVI', contact: '9876543251', area: 'Panchavati', paymentType: 'Cash', status: 'Active', joinDate: '2021-04-17' },
  { id: 52, name: 'RAVINDRA SHIRODE', contact: '9876543252', area: 'Cidco', paymentType: 'UPI', status: 'Active', joinDate: '2019-11-30' },
  { id: 53, name: 'RAVINDRA WAGH', contact: '9876543253', area: 'Satpur', paymentType: 'Cash', status: 'Active', joinDate: '2022-01-14' },
  { id: 54, name: 'RISHIKESH GAIKWAD', contact: '9876543254', area: 'Deolali', paymentType: 'Credit', status: 'Active', joinDate: '2021-07-26' },
  { id: 55, name: 'SACHIN MAHAJAN', contact: '9876543255', area: 'Gangapur Road', paymentType: 'Cash', status: 'Active', joinDate: '2020-03-04' },
  { id: 56, name: 'SACHIN TRIMBAKE', contact: '9876543256', area: 'Trimbak Road', paymentType: 'UPI', status: 'Active', joinDate: '2021-10-18' },
  { id: 57, name: 'SAMADHAN DHADIWAL', contact: '9876543257', area: 'Nashik Road', paymentType: 'Cash', status: 'Active', joinDate: '2019-07-09' },
  { id: 58, name: 'SAMPAT JAYBHAVE', contact: '9876543258', area: 'Panchavati', paymentType: 'Cash', status: 'Inactive', joinDate: '2022-04-25' },
  { id: 59, name: 'SANDEEP KSHIRSAGAR', contact: '9876543259', area: 'Cidco', paymentType: 'UPI', status: 'Active', joinDate: '2021-01-12' },
  { id: 60, name: 'SANDIP ZINZURDE', contact: '9876543260', area: 'Satpur', paymentType: 'Cash', status: 'Active', joinDate: '2020-08-07' },
  { id: 61, name: 'SANJAY SHELAR', contact: '9876543261', area: 'Deolali', paymentType: 'Credit', status: 'Active', joinDate: '2019-02-20' },
  { id: 62, name: 'SANTOSH DEVHARE', contact: '9876543262', area: 'Gangapur Road', paymentType: 'Cash', status: 'Active', joinDate: '2022-07-14' },
  { id: 63, name: 'SANTOSH JADHAV', contact: '9876543263', area: 'Trimbak Road', paymentType: 'UPI', status: 'Active', joinDate: '2021-05-29' },
  { id: 64, name: 'SATISH SAHAJRAO', contact: '9876543264', area: 'Nashik Road', paymentType: 'Cash', status: 'Active', joinDate: '2020-12-16' },
  { id: 65, name: 'SHIVAJI GAIKWAD', contact: '9876543265', area: 'Panchavati', paymentType: 'Cash', status: 'Active', joinDate: '2021-09-21' },
  { id: 66, name: 'SHYAM KOPAL', contact: '9876543266', area: 'Cidco', paymentType: 'UPI', status: 'Active', joinDate: '2019-04-06' },
  { id: 67, name: 'SIDDHARTH SHARDUL', contact: '9876543267', area: 'Satpur', paymentType: 'Cash', status: 'Active', joinDate: '2022-02-27' },
  { id: 68, name: 'SUDAM RAHATAL', contact: '9876543268', area: 'Deolali', paymentType: 'Credit', status: 'Active', joinDate: '2021-06-10' },
  { id: 69, name: 'SUNIL JADHAV', contact: '9876543269', area: 'Gangapur Road', paymentType: 'Cash', status: 'Active', joinDate: '2020-10-23' },
  { id: 70, name: 'SANDIP MADHAWAI', contact: '9876543270', area: 'Trimbak Road', paymentType: 'UPI', status: 'Active', joinDate: '2019-01-15' },
  { id: 71, name: 'SHUBHAM JADHAV', contact: '9876543271', area: 'Nashik Road', paymentType: 'Cash', status: 'Active', joinDate: '2022-05-03' },
  { id: 72, name: 'TANJEEM SAYYAD', contact: '9876543272', area: 'Panchavati', paymentType: 'Cash', status: 'Active', joinDate: '2021-11-16' },
  { id: 73, name: 'VAJID PATHAN', contact: '9876543273', area: 'Cidco', paymentType: 'UPI', status: 'Active', joinDate: '2020-06-01' },
  { id: 74, name: 'VARSHA M.DEOULGAONKAR', contact: '9876543274', area: 'Satpur', paymentType: 'Cash', status: 'Active', joinDate: '2021-03-14' },
  { id: 75, name: 'VINOD CHAVAN', contact: '9876543275', area: 'Deolali', paymentType: 'Credit', status: 'Active', joinDate: '2019-09-27' },
  { id: 76, name: 'VINOD PATIL', contact: '9876543276', area: 'Gangapur Road', paymentType: 'Cash', status: 'Active', joinDate: '2022-08-09' },
  { id: 77, name: 'VINOD SALANTRE', contact: '9876543277', area: 'Trimbak Road', paymentType: 'UPI', status: 'Active', joinDate: '2021-04-24' },
  { id: 78, name: 'VISHWANATH SALI', contact: '9876543278', area: 'Nashik Road', paymentType: 'Cash', status: 'Active', joinDate: '2020-01-07' },
  { id: 79, name: 'VISHNU MAGAR', contact: '9876543279', area: 'Panchavati', paymentType: 'Cash', status: 'Active', joinDate: '2022-10-21' },
];

export const MOCK_DAILY_BILLING: DailyBillingRecord[] = [
  {
    id: 'bill-20260423-001',
    hawkerId: 1,
    hawkerName: 'AJAY BAGUL',
    date: '2026-04-23',
    entries: [
      { srNo: 1, newspaper: 'Lokmat CNX', rate: 3.50, supplyQty: 100, returnQty: 10, netQty: 90, total: 315.00 },
      { srNo: 2, newspaper: 'Lokmat SSA', rate: 2.50, supplyQty: 20, returnQty: 10, netQty: 10, total: 25.00 },
      { srNo: 3, newspaper: 'Lokmat L.T.', rate: 2.80, supplyQty: 30, returnQty: 10, netQty: 20, total: 56.00 },
      { srNo: 4, newspaper: 'Punya', rate: 3.50, supplyQty: 10, returnQty: 5, netQty: 5, total: 17.50 },
    ],
    totalBill: 413.50,
    whatsappSent: true,
    paymentStatus: 'Paid',
    paymentType: 'Cash',
  },
  {
    id: 'bill-20260423-002',
    hawkerId: 2,
    hawkerName: 'AJIT BORSE',
    date: '2026-04-23',
    entries: [
      { srNo: 1, newspaper: 'Lokmat CNX', rate: 3.50, supplyQty: 80, returnQty: 5, netQty: 75, total: 262.50 },
      { srNo: 2, newspaper: 'Sakal', rate: 4.00, supplyQty: 40, returnQty: 8, netQty: 32, total: 128.00 },
      { srNo: 3, newspaper: 'Times of India', rate: 5.00, supplyQty: 25, returnQty: 3, netQty: 22, total: 110.00 },
    ],
    totalBill: 500.50,
    whatsappSent: true,
    paymentStatus: 'Pending',
    paymentType: 'UPI',
  },
  {
    id: 'bill-20260423-003',
    hawkerId: 3,
    hawkerName: 'AMOL SHIMPI',
    date: '2026-04-23',
    entries: [
      { srNo: 1, newspaper: 'Maharashtra Times', rate: 4.00, supplyQty: 60, returnQty: 7, netQty: 53, total: 212.00 },
      { srNo: 2, newspaper: 'Deshdoot', rate: 3.50, supplyQty: 35, returnQty: 4, netQty: 31, total: 108.50 },
    ],
    totalBill: 320.50,
    whatsappSent: false,
    paymentStatus: 'Partial',
    paymentType: 'Cash',
  },
  {
    id: 'bill-20260423-004',
    hawkerId: 5,
    hawkerName: 'ARUN PATHARIKAR',
    date: '2026-04-23',
    entries: [
      { srNo: 1, newspaper: 'Lokmat CNX', rate: 3.50, supplyQty: 120, returnQty: 15, netQty: 105, total: 367.50 },
      { srNo: 2, newspaper: 'Pudhari', rate: 3.50, supplyQty: 50, returnQty: 6, netQty: 44, total: 154.00 },
      { srNo: 3, newspaper: 'Saamana', rate: 3.20, supplyQty: 30, returnQty: 3, netQty: 27, total: 86.40 },
    ],
    totalBill: 607.90,
    whatsappSent: true,
    paymentStatus: 'Paid',
    paymentType: 'Cash',
  },
  {
    id: 'bill-20260423-005',
    hawkerId: 10,
    hawkerName: 'AKSHAY SHEVARE',
    date: '2026-04-23',
    entries: [
      { srNo: 1, newspaper: 'Times of India', rate: 5.00, supplyQty: 45, returnQty: 5, netQty: 40, total: 200.00 },
      { srNo: 2, newspaper: 'Maharashtra Times', rate: 4.00, supplyQty: 55, returnQty: 8, netQty: 47, total: 188.00 },
    ],
    totalBill: 388.00,
    whatsappSent: true,
    paymentStatus: 'Pending',
    paymentType: 'Cash',
  },
  {
    id: 'bill-20260422-001',
    hawkerId: 1,
    hawkerName: 'AJAY BAGUL',
    date: '2026-04-22',
    entries: [
      { srNo: 1, newspaper: 'Lokmat CNX', rate: 3.50, supplyQty: 100, returnQty: 12, netQty: 88, total: 308.00 },
      { srNo: 2, newspaper: 'Lokmat SSA', rate: 2.50, supplyQty: 20, returnQty: 8, netQty: 12, total: 30.00 },
    ],
    totalBill: 338.00,
    whatsappSent: true,
    paymentStatus: 'Paid',
    paymentType: 'Cash',
  },
  {
    id: 'bill-20260422-002',
    hawkerId: 4,
    hawkerName: 'ANIL MEHETRE',
    date: '2026-04-22',
    entries: [
      { srNo: 1, newspaper: 'Navbharat', rate: 3.50, supplyQty: 70, returnQty: 9, netQty: 61, total: 213.50 },
      { srNo: 2, newspaper: 'Navbharat Ravi', rate: 4.20, supplyQty: 40, returnQty: 4, netQty: 36, total: 151.20 },
    ],
    totalBill: 364.70,
    whatsappSent: true,
    paymentStatus: 'Partial',
    paymentType: 'Credit',
  },
];

export const MOCK_MONTHLY_TRACKER: MonthlyTrackerRow[] = MASTER_DATA.slice(0, 20).map((hawker, index) => {
  const baseAmounts: Record<string, number> = {};
  NEWSPAPERS.forEach((np, i) => {
    const seed = (hawker.id * 7 + i * 13) % 100;
    baseAmounts[np.name] = seed > 60 ? Math.round((seed * np.rate * 0.8 + 50) * 10) / 10 : 0;
  });
  const grandTotal = Object.values(baseAmounts).reduce((a, b) => a + b, 0);
  return {
    hawkerId: hawker.id,
    hawkerName: hawker.name,
    newspapers: baseAmounts,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
});

export const MONTHLY_CHART_DATA = [
  { month: 'Nov', total: 48320 },
  { month: 'Dec', total: 52140 },
  { month: 'Jan', total: 49870 },
  { month: 'Feb', total: 45200 },
  { month: 'Mar', total: 53680 },
  { month: 'Apr', total: 38450 },
];

export const NEWSPAPER_VOLUME_DATA = [
  { name: 'Lokmat CNX', netQty: 1240 },
  { name: 'Lokmat SSA', netQty: 420 },
  { name: 'Lokmat L.T.', netQty: 340 },
  { name: 'Punya', netQty: 290 },
  { name: 'Deshdoot', netQty: 610 },
  { name: 'Pudhari', netQty: 540 },
  { name: 'Navbharat', netQty: 480 },
  { name: 'Navrashtra', netQty: 260 },
  { name: 'Samna', netQty: 380 },
  { name: 'Pratkshya', netQty: 210 },
  { name: 'Yasho', netQty: 175 },
  { name: 'Eng Deshdoot', netQty: 140 },
  { name: 'Chaufer', netQty: 120 },
  { name: 'Samrat', netQty: 95 },
];

export const PAYMENT_STATUS_DATA = [
  { name: 'Paid', value: 38, fill: '#16a34a' },
  { name: 'Pending', value: 27, fill: '#dc2626' },
  { name: 'Partial', value: 14, fill: '#d97706' },
];