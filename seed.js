// Starting data. Used only the first time the app opens (or after "Reset").
// Intervals: mi = miles, mo = months. "last" = most recent known service.
// last.assumed marks a base date used because no record exists.
window.SRVC_SEED = {
  version: 1,
  cars: [
    {
      id: 'gti', unit: '01', name: 'GTI',
      make: 'VW', model: 'Golf GTI', year: 2019, trim: 'Autobahn',
      engine: 'DKFA 2.0 TSI', trans: 'DQ381 7-DSG', oil: '508 00 0W-20 · 5.7 L',
      vin: '', paintCode: 'LY3D', paintName: 'Tornado Red', paintHex: '#C8102E',
      inService: '2020-01-31', shop: 'City VW Chicago',
      odo: [
        { date: '2025-12-03', miles: 55182 },
        { date: '2026-01-12', miles: 55779 },
        { date: '2026-10-27', miles: 58039 }
      ],
      items: [
        { id: 'dsg', name: 'DSG fluid & filter', mi: 40000, mo: null, last: { date: '2020-01-31', miles: 0, assumed: true }, notes: 'No record in Carfax. Shop job.' },
        { id: 'plugs', name: 'Spark plugs', mi: 40000, mo: 48, last: { date: '2020-01-31', miles: 0, assumed: true }, notes: 'No record. Plan: NGK 06K 905 601 M (one step colder).' },
        { id: 'belt', name: 'Serpentine belt', mi: null, mo: null, last: null, flag: 'red', notes: 'Flagged red at City VW inspection 12.03.25. Quoted $255.04.' },
        { id: 'oil', name: 'Oil & filter', mi: 10000, mo: 12, last: { date: '2025-11-21', miles: null, assumed: true }, notes: 'VW 508 00 0W-20, about 5.7 L. Filter 06L 115 562 B, 32 mm cap. Due date taken from the dash reminder.' },
        { id: 'rotation', name: 'Tire rotation', mi: 10000, mo: null, last: { date: '2025-07-15', miles: 50805 }, notes: '' },
        { id: 'air', name: 'Engine air filter', mi: 40000, mo: null, last: { date: '2022-09-15', miles: 30144 }, flag: 'yellow', notes: 'Mann 5Q0 129 620 B. Flagged yellow 12.03.25.' },
        { id: 'wipers', name: 'Wiper blades', mi: null, mo: 12, last: null, flag: 'yellow', notes: 'Flagged yellow 12.03.25.' },
        { id: 'brakefluid', name: 'Brake fluid', mi: null, mo: 24, last: { date: '2025-07-15', miles: 50805 }, notes: '' },
        { id: 'coolant', name: 'Coolant', mi: null, mo: null, last: { date: '2025-12-03', miles: 55182 }, notes: 'G12evo exchange.' },
        { id: 'cabin', name: 'Cabin filter', mi: 20000, mo: 24, last: { date: '2025-12-04', miles: 55182 }, notes: '5Q0 819 669' },
        { id: 'battery', name: 'Battery', mi: null, mo: null, last: { date: '2025-12-04', miles: 55182 }, notes: 'OEM 000 915 089 BC, adaptation done.' },
        { id: 'pads', name: 'Brake pads', mi: null, mo: null, last: { date: '2025-12-03', miles: 55182 }, notes: 'Measured 8 mm on all four.' }
      ],
      scans: []
    },
    {
      id: 'xc40', unit: '02', name: 'XC40',
      make: 'Volvo', model: 'XC40', year: 2019, trim: 'R-Design',
      engine: '', trans: '', oil: '', vin: '', paintCode: '', paintName: '', paintHex: '',
      inService: '', shop: '',
      odo: [],
      items: [
        { id: 'oil', name: 'Oil & filter', mi: 10000, mo: 12, last: null, notes: '' },
        { id: 'rotation', name: 'Tire rotation', mi: 10000, mo: null, last: null, notes: '' },
        { id: 'brakefluid', name: 'Brake fluid', mi: null, mo: 24, last: null, notes: '' },
        { id: 'cabin', name: 'Cabin filter', mi: 20000, mo: 24, last: null, notes: '' },
        { id: 'air', name: 'Engine air filter', mi: 40000, mo: null, last: null, notes: '' },
        { id: 'plugs', name: 'Spark plugs', mi: 60000, mo: null, last: null, notes: 'Check the Volvo schedule for this engine.' },
        { id: 'wipers', name: 'Wiper blades', mi: null, mo: 12, last: null, notes: '' }
      ],
      scans: []
    }
  ],
  log: [
    { id: 'h1', car: 'gti', date: '2020-07-15', miles: 4770, items: ['oil'], by: 'Shop', cost: null, notes: 'AutoNation VW Hilton Head (Carfax)' },
    { id: 'h2', car: 'gti', date: '2020-11-15', miles: 9832, items: [], by: 'Shop', cost: null, notes: '10k service (Carfax)' },
    { id: 'h3', car: 'gti', date: '2021-08-15', miles: 19952, items: [], by: 'Shop', cost: null, notes: '20k service (Carfax)' },
    { id: 'h4', car: 'gti', date: '2022-09-15', miles: 30144, items: ['air', 'cabin', 'brakefluid'], by: 'Shop', cost: null, notes: '30k service, Crain VW Fayetteville. Fuel system clean too.' },
    { id: 'h5', car: 'gti', date: '2024-08-15', miles: 40663, items: ['oil', 'rotation'], by: 'Shop', cost: null, notes: 'Crain VW (Carfax)' },
    { id: 'h6', car: 'gti', date: '2025-07-15', miles: 50805, items: ['oil', 'brakefluid', 'rotation'], by: 'Shop', cost: null, notes: 'Crain VW. Fuel injection service too.' },
    { id: 'h7', car: 'gti', date: '2025-12-03', miles: 55182, items: ['coolant'], by: 'Shop', cost: 298.98, notes: 'City VW. Multi-point inspection.' },
    { id: 'h8', car: 'gti', date: '2025-12-04', miles: 55182, items: ['battery', 'cabin'], by: 'Shop', cost: 302.97, notes: 'City VW. Warranty paid the rest.' }
  ]
};
