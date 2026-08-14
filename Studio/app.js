const icons = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h7l2 3h9v9H3z"/></svg>',
  layout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6V4h16v2M12 4v16M8 20h8"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 16 5-5 4 4 2-2 7 7"/><circle cx="16" cy="9" r="1.5"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 9 4-2v10l-4-2z"/></svg>',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>',
  shapes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="17" r="3"/><path d="M14 4h6v6h-6zM14 20l3-7 4 7z"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4m0 0 4 4m-4-4-4 4"/><path d="M4 16v4h16v-4"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>',
  palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 0 0 0 18h1.2a1.8 1.8 0 0 0 1.2-3.1 1.8 1.8 0 0 1 1.2-3.1H17a4 4 0 0 0 0-8h-1"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10" cy="7" r=".8"/><circle cx="13.5" cy="7.5" r=".8"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/></svg>',
  redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h2"/></svg>',
  duplicate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12"/><path d="M4 16V4h12"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/></svg>',
  rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 5 5 9-11"/></svg>',
};

const photos = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1511556820780-d912e42b4980?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1516192518150-0d8fee5425e3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1557862921-37829c790f19?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1562788869-4ed32648eb72?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1557800636-894a64c1696f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515169067865-5387ec356754?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=1200&q=80",
];

const showcasePhotos = {
  fields: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  leaves: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1200&q=80",
  crops: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80",
  farm: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80",
  vegetables: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
  business: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
  robot: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
  robotics: "https://images.unsplash.com/photo-1516192518150-0d8fee5425e3?auto=format&fit=crop&w=1200&q=80",
  circuit: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  // Electric vehicle / automotive
  ev: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80",
  evCharging: "https://images.unsplash.com/photo-1647891983295-d7ea55fe3ae6?auto=format&fit=crop&w=1200&q=80",
  evRoad: "https://images.unsplash.com/photo-1617704548623-340376564e68?auto=format&fit=crop&w=1200&q=80",
  car: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80",
  carNight: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
  // Healthcare / Medical
  health: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
  medical: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1200&q=80",
  // Education / School
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
  classroom: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80",
  // Climate / Environment / Energy
  climate: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
  solar: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
  wind: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=80",
  // Space / Science
  space: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80",
  science: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",
  // Sports / Fitness
  sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
  // City / Architecture
  city: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80",
  arch: "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1200&q=80",
  // Food
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  // Travel
  travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
  // Finance
  finance: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
  // Abstract / General
  abstract: "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&w=1200&q=80",
  gradient: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80",
};

const stockVideos = [
  { title: "Ocean Aerial", theme: "Sea / Drone", duration: "00:21", tall: false, poster: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
  { title: "City Motion", theme: "Urban", duration: "00:37", tall: false, poster: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
  { title: "Autumn Forest", theme: "Nature", duration: "00:32", tall: false, poster: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
  { title: "Mountain Lake", theme: "Travel", duration: "01:03", tall: false, poster: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
  { title: "Beach Walk", theme: "Lifestyle", duration: "00:05", tall: false, poster: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
  { title: "Work Desk", theme: "Professional", duration: "00:12", tall: true, poster: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
  { title: "Cloud Layer", theme: "Sky", duration: "00:15", tall: false, poster: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4" },
  { title: "Tropical Coast", theme: "Beach", duration: "00:37", tall: false, poster: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
  { title: "Night Road", theme: "Cinematic", duration: "00:41", tall: false, poster: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
  { title: "Fog Valley", theme: "Moody", duration: "00:28", tall: false, poster: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
  { title: "River Bend", theme: "Drone", duration: "00:26", tall: false, poster: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
  { title: "Steam City", theme: "Industrial", duration: "00:17", tall: false, poster: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
  { title: "Sunset Water", theme: "Calm", duration: "00:19", tall: false, poster: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
  { title: "Forest Walk", theme: "Woods", duration: "00:30", tall: true, poster: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
  { title: "Fashion Detail", theme: "Style", duration: "00:37", tall: false, poster: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
  { title: "Clear Water", theme: "POV", duration: "00:08", tall: true, poster: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
  { title: "Startup Team", theme: "Office", duration: "00:34", tall: false, poster: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
  { title: "AI Tech", theme: "Technology", duration: "00:24", tall: false, poster: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4" },
  { title: "Food Closeup", theme: "Food", duration: "00:16", tall: false, poster: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
  { title: "Interior Pan", theme: "Home", duration: "00:29", tall: false, poster: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
];

stockVideos.push(
  { title: "Waterfall Mist", theme: "Nature", duration: "00:22", tall: false, poster: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
  { title: "Coffee Pour", theme: "Cafe", duration: "00:14", tall: false, poster: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
  { title: "Business Walk", theme: "Professional", duration: "00:31", tall: true, poster: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
  { title: "Neon Street", theme: "Nightlife", duration: "00:27", tall: false, poster: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
  { title: "Fitness Motion", theme: "Sports", duration: "00:18", tall: true, poster: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
  { title: "Product Glow", theme: "Commercial", duration: "00:20", tall: false, poster: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4" },
  { title: "Wedding Lights", theme: "Event", duration: "00:24", tall: false, poster: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
  { title: "Desert Drive", theme: "Travel", duration: "00:33", tall: false, poster: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
  { title: "Skincare Closeup", theme: "Beauty", duration: "00:16", tall: true, poster: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
  { title: "Laptop Focus", theme: "Work", duration: "00:21", tall: false, poster: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
  { title: "Festival Color", theme: "Celebration", duration: "00:29", tall: false, poster: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
  { title: "Luxury Interior", theme: "Architecture", duration: "00:26", tall: false, poster: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
  { title: "Fashion Walk", theme: "Style", duration: "00:19", tall: true, poster: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
  { title: "Healthcare Team", theme: "Medical", duration: "00:25", tall: false, poster: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
  { title: "Coding Desk", theme: "Technology", duration: "00:30", tall: false, poster: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4" },
  { title: "Mountain Road", theme: "Adventure", duration: "00:28", tall: false, poster: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
  { title: "Restaurant Plate", theme: "Food", duration: "00:17", tall: false, poster: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
  { title: "Creator Studio", theme: "Podcast", duration: "00:23", tall: false, poster: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
  { title: "Golden Field", theme: "Agriculture", duration: "00:32", tall: false, poster: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
  { title: "Shopping Mood", theme: "Retail", duration: "00:20", tall: true, poster: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
  { title: "Data Center", theme: "AI Tech", duration: "00:36", tall: false, poster: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4" },
  { title: "Yoga Morning", theme: "Wellness", duration: "00:15", tall: true, poster: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
  { title: "Rain Window", theme: "Moody", duration: "00:18", tall: false, poster: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
  { title: "Team Meeting", theme: "Business", duration: "00:35", tall: false, poster: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80", src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }
);

const brandPalettes = [
  ["#111827", "#f8fafc", "#06b6d4", "#f97316"],
  ["#0f172a", "#f1f5f9", "#a3e635", "#38bdf8"],
  ["#351c75", "#fff7ed", "#fb7185", "#facc15"],
  ["#14532d", "#ecfdf5", "#22c55e", "#f59e0b"],
  ["#3b0764", "#faf5ff", "#d946ef", "#14b8a6"],
  ["#1f2937", "#fef3c7", "#ef4444", "#2563eb"],
];

const categories = [
  { id: "presentation", name: "Presentation", size: "16:9", subjects: ["Startup Pitch", "Business Plan", "Marketing Strategy", "Education Lesson", "Sales Report", "Product Launch"] },
  { id: "poster", name: "Poster", size: "Print", subjects: ["Music Event", "Sale Promo", "Workshop", "Awareness Campaign", "Sports Match", "Art Show"] },
  { id: "social", name: "Social Post", size: "Square", subjects: ["Fashion Sale", "Quote", "Product Feature", "Travel Moment", "Food Promo", "Brand Story"] },
  { id: "story", name: "Story", size: "9:16", subjects: ["Flash Sale", "Countdown", "New Arrival", "Travel Diary", "Creator Update", "Event Reminder"] },
  { id: "business", name: "Business", size: "Brand", subjects: ["Agency Profile", "Service Menu", "Consulting", "Real Estate", "Clinic Service", "Company Update"] },
  { id: "youtube", name: "YouTube Thumbnail", size: "16:9", subjects: ["Podcast", "Breaking News", "Travel Vlog", "Finance", "AI Guide", "Gaming"] },
  { id: "charts", name: "Graph & Chart", size: "Data", subjects: ["Bar Chart", "Pie Chart", "Org Chart", "Comparison Chart", "Sales Funnel", "Process Diagram"] },
  { id: "invitation", name: "Invitation", size: "Event", subjects: ["Wedding", "Birthday", "Dinner Party", "Graduation", "Store Opening", "Festival Party"] },
];

const templateStyles = [
  { name: "Editorial", layout: "split" },
  { name: "Bold", layout: "poster" },
  { name: "Minimal", layout: "clean" },
  { name: "Gallery", layout: "photo" },
  { name: "Data", layout: "dashboard" },
];

const powerpointFonts = [
  "Agency FB",
  "Algerian",
  "Aptos",
  "Aptos Display",
  "Aptos Narrow",
  "Arial",
  "Arial Black",
  "Arial Narrow",
  "Arial Rounded MT Bold",
  "Bahnschrift",
  "Bahnschrift Condensed",
  "Bahnschrift Light",
  "Bahnschrift Light Condensed",
  "Bahnschrift Light SemiCondensed",
  "Bahnschrift SemiBold",
  "Bahnschrift SemiBold Condensed",
  "Bahnschrift SemiBold SemiCondensed",
  "Bahnschrift SemiCondensed",
  "Bahnschrift SemiLight",
  "Bahnschrift SemiLight Condensed",
  "Bahnschrift SemiLight SemiCondensed",
  "Baskerville Old Face",
  "Bauhaus 93",
  "Bell MT",
  "Berlin Sans FB",
  "Berlin Sans FB Demi",
  "Bernard MT Condensed",
  "Blackadder ITC",
  "Bodoni MT",
  "Bodoni MT Black",
  "Bodoni MT Condensed",
  "Bodoni MT Poster Compressed",
  "Book Antiqua",
  "Bookman Old Style",
  "Bookshelf Symbol 7",
  "Bradley Hand ITC",
  "Britannic Bold",
  "Broadway",
  "Brush Script MT",
  "Calibri",
  "Calibri Light",
  "Kristen ITC",
  "Kunstler Script",
  "Leelawadee UI",
  "Leelawadee UI Semilight",
  "Lucida Bright",
  "Lucida Calligraphy",
  "Lucida Console",
  "Lucida Fax",
  "Lucida Handwriting",
  "Lucida Sans",
  "Lucida Sans Typewriter",
  "Lucida Sans Unicode",
  "Magneto",
  "Maiandra GD",
  "Malgun Gothic",
  "Malgun Gothic Semilight",
  "Mangal",
  "Marlett",
  "Matura MT Script Capitals",
  "Microsoft Himalaya",
  "Microsoft JhengHei",
];

const builtinSlideLayouts = [
  { id: "title", name: "Title Slide", preview: "title" },
  { id: "title-content", name: "Title and Content", preview: "title-content" },
  { id: "section", name: "Section Header", preview: "section" },
  { id: "two-content", name: "Two Content", preview: "two-content" },
  { id: "comparison", name: "Comparison", preview: "comparison" },
  { id: "title-only", name: "Title Only", preview: "title-only" },
  { id: "blank", name: "Blank", preview: "blank" },
  { id: "caption", name: "Content with Caption", preview: "caption" },
  { id: "picture-caption", name: "Picture with Caption", preview: "picture-caption" },
];

const textStylePresets = [
  { id: "business-journal", label: "Business Journal", className: "text-business-journal", text: "BUSINESS\nJOURNAL", fontSize: 44, fontWeight: 800, fontFamily: "Georgia", color: "#111111", w: 420, h: 115, lineHeight: 0.86 },
  { id: "awesome-news", label: "Awesome News", className: "text-awesome-news", text: "Awesome\nNEWS", fontSize: 46, fontWeight: 850, fontFamily: "Trebuchet MS", color: "#ff7a35", w: 410, h: 105, lineHeight: 0.9 },
  { id: "bride-groom", label: "Bride & Groom", className: "text-bride-groom", text: "Bride &\nGROOM", fontSize: 52, fontWeight: 500, fontFamily: "Georgia", color: "#27563e", w: 430, h: 130, lineHeight: 0.9 },
  { id: "survey-memo", label: "Employee Opinion Survey", className: "text-survey-memo", text: "DATE       October 25, 2025\nSUBJECT    Employee Opinion Survey", fontSize: 19, fontWeight: 700, fontFamily: "Inter", color: "#111827", w: 520, h: 90, lineHeight: 1.45 },
  { id: "asap", label: "ASAP", className: "text-asap", text: "ASAP!\nAS SOON AS POSSIBLE.", fontSize: 56, fontWeight: 900, fontFamily: "Inter", color: "#8b5cf6", w: 520, h: 120, lineHeight: 0.92 },
  { id: "sale-stack", label: "Sale Sale Sale", className: "text-sale-stack", text: "SALE\nSALE\nSALE", fontSize: 58, fontWeight: 800, fontFamily: "Inter", color: "#f6ef00", w: 430, h: 175, lineHeight: 0.76 },
  { id: "big-strategy", label: "Big Strategy", className: "text-big-strategy", text: "BIG\nstrategy", fontSize: 57, fontWeight: 850, fontFamily: "Georgia", color: "#405cc8", w: 430, h: 128, lineHeight: 0.78 },
  { id: "thank-you", label: "Thank you", className: "text-thank-you", text: "Thank\nyou!", fontSize: 58, fontWeight: 900, fontFamily: "Trebuchet MS", color: "#0070c9", w: 360, h: 135, lineHeight: 0.78 },
  { id: "official-memo", label: "Official Memo", className: "text-official-memo", text: "ASTERISK MEDIA INC.\nOfficial Memo\nRe: Status Report Meeting\nDate: January 12, 2029", fontSize: 24, fontWeight: 500, fontFamily: "Georgia", color: "#111111", w: 500, h: 130, lineHeight: 1.25 },
  { id: "push-pen", label: "Push Pen", className: "text-push-pen", text: "push\npen", fontSize: 50, fontWeight: 900, fontFamily: "Trebuchet MS", color: "#ff7cbd", w: 330, h: 110, lineHeight: 0.74 },
  { id: "join-celebration", label: "Join the Celebration", className: "text-join-celebration", text: "Join the\nCELEBRATION!", fontSize: 38, fontWeight: 850, fontFamily: "Georgia", color: "#1f4f7a", w: 430, h: 105, lineHeight: 0.9 },
  { id: "brillo", label: "Brillo", className: "text-brillo", text: "BRILLO", fontSize: 54, fontWeight: 900, fontFamily: "Inter", color: "#ff63c6", w: 330, h: 78, lineHeight: 1 },
  { id: "coffee-please", label: "Coffee Please", className: "text-coffee-please", text: "COFFEE\nPLEASE", fontSize: 44, fontWeight: 900, fontFamily: "Georgia", color: "#c9894a", w: 410, h: 110, lineHeight: 0.9 },
  { id: "back-online", label: "Back Online", className: "text-back-online", text: "BACK\nONLINE", fontSize: 48, fontWeight: 900, fontFamily: "Georgia", color: "#344ca4", w: 360, h: 116, lineHeight: 0.78 },
  { id: "net-revenue", label: "Net Revenue", className: "text-net-revenue", text: "Net\nREVENUE", fontSize: 56, fontWeight: 900, fontFamily: "Trebuchet MS", color: "#337eb6", w: 420, h: 145, lineHeight: 0.78 },
  { id: "not-vintage", label: "Not old, Vintage", className: "text-not-vintage", text: "Not old,\nVintage.", fontSize: 42, fontWeight: 650, fontFamily: "Georgia", color: "#6e7cff", w: 360, h: 110, lineHeight: 0.92 },
  { id: "pixel-dreams", label: "Pixel Dreams", className: "text-pixel-dreams", text: "PIXEL\nDREAMS", fontSize: 38, fontWeight: 900, fontFamily: "Courier New", color: "#d575ff", w: 440, h: 100, lineHeight: 0.9 },
  { id: "parker-maison", label: "Parker Maison", className: "text-parker-maison", text: "PARKER\nMAISON &", fontSize: 45, fontWeight: 500, fontFamily: "Georgia", color: "#d8c8ad", w: 400, h: 122, lineHeight: 0.82 },
  { id: "bold-moves", label: "Bold Moves", className: "text-bold-moves", text: "BOLD\nmoves", fontSize: 50, fontWeight: 900, fontFamily: "Trebuchet MS", color: "#ff4a12", w: 360, h: 115, lineHeight: 0.82 },
  { id: "spring-shopping", label: "Spring Shopping", className: "text-spring-shopping", text: "Spring Shopping\n• FINDS •", fontSize: 38, fontWeight: 850, fontFamily: "Georgia", color: "#8790d9", w: 430, h: 105, lineHeight: 1 },
  { id: "road-trip", label: "Road trip", className: "text-road-trip", text: "Road trip >", fontSize: 34, fontWeight: 850, fontFamily: "Inter", color: "#ffffff", w: 280, h: 58, lineHeight: 1 },
  { id: "spring-collection", label: "Spring Collection", className: "text-spring-collection", text: "Spring\nCOLLECTION", fontSize: 52, fontWeight: 750, fontFamily: "Georgia", color: "#42b779", w: 410, h: 110, lineHeight: 0.82 },
  { id: "lovely", label: "Lovely", className: "text-lovely", text: "Lovely", fontSize: 58, fontWeight: 650, fontFamily: "Trebuchet MS", color: "#ff3f62", w: 330, h: 85, lineHeight: 1 },
  { id: "coming-soon-text", label: "Coming Soon", className: "text-coming-soon", text: "COMING\nSOON", fontSize: 43, fontWeight: 450, fontFamily: "Inter", color: "#f4dc00", w: 340, h: 105, lineHeight: 1 },
];

const showcasePresentationTemplates = [
  { id: "presentation-showcase-1", category: "presentation", name: "Patterns of Cultivated Land", sub: "Agriculture from above", size: "1 of 10", layout: "photo", preview: "cultivated-land", photo: showcasePhotos.fields, palette: ["#153f21", "#f8fafc", "#79a84f", "#ffffff"] },
  { id: "presentation-showcase-2", category: "presentation", name: "Agriculture", sub: "Presentation template", size: "1 of 11", layout: "photo", preview: "agri-hills", photo: showcasePhotos.crops, palette: ["#5d6339", "#f8fafc", "#97ad61", "#ffffff"] },
  { id: "presentation-showcase-3", category: "presentation", name: "Our Project", sub: "Agricultural case study", size: "04 pages", layout: "clean", preview: "our-project", photo: showcasePhotos.leaves, palette: ["#2f7d12", "#ffffff", "#7bd41d", "#eef8df"] },
  { id: "presentation-showcase-4", category: "presentation", name: "Rice Fields Ecosystem", sub: "Field research presentation", size: "Report", layout: "photo", preview: "rice-fields", photo: showcasePhotos.farm, palette: ["#003c32", "#f8fafc", "#b2e6db", "#ffffff"] },
  { id: "presentation-showcase-5", category: "presentation", name: "Farmer", sub: "Presentation template", size: "Cover", layout: "photo", preview: "farmer-frame", photo: showcasePhotos.fields, palette: ["#062d28", "#f8fafc", "#25e883", "#ffffff"] },
  { id: "presentation-showcase-6", category: "presentation", name: "Pitch Deck Presentation", sub: "Smart sustainable farming", size: "Pitch", layout: "split", preview: "farm-pitch", photo: showcasePhotos.farm, palette: ["#123f18", "#ffffff", "#e8c96c", "#f6f0d2"] },
  { id: "presentation-showcase-7", category: "presentation", name: "Tropical Farm Life", sub: "Fresh air, green fields", size: "Nature", layout: "dashboard", preview: "tropical-farm", photo: showcasePhotos.leaves, palette: ["#17351e", "#f8fafc", "#b6a642", "#ffffff"] },
  { id: "presentation-showcase-8", category: "presentation", name: "Agriculture Presentation", sub: "Community farming", size: "Page 01", layout: "split", preview: "agri-strip", photo: showcasePhotos.crops, palette: ["#23461f", "#f8fafc", "#ffffff", "#9ad069"] },
  { id: "presentation-showcase-9", category: "presentation", name: "Agriculture Pitch Deck", sub: "Feeding the future", size: "Brand", layout: "clean", preview: "veggie-pitch", photo: showcasePhotos.vegetables, palette: ["#506f1d", "#ffffff", "#d14b35", "#eef6d7"] },
  { id: "presentation-showcase-10", category: "presentation", name: "Business Project", sub: "Corporate proposal", size: "Business", layout: "clean", preview: "business-project", photo: showcasePhotos.business, palette: ["#111827", "#ffffff", "#111827", "#e5e7eb"] },
  { id: "presentation-showcase-11", category: "presentation", name: "Introduction", sub: "Green brand chapter", size: "2 of 10", layout: "photo", preview: "leaf-intro", photo: showcasePhotos.leaves, palette: ["#003528", "#f8fafc", "#d6b94e", "#ffffff"] },
  { id: "presentation-showcase-12", category: "presentation", name: "Agriculture", sub: "Illustrated farm kit", size: "Template", layout: "poster", preview: "harvest-illustration", photo: showcasePhotos.vegetables, palette: ["#ad6b24", "#f6e0b8", "#8fb6a8", "#f59e0b"] },
  { id: "presentation-showcase-13", category: "presentation", name: "Robotic Technology", sub: "Technology presentation", size: "1 of 12", layout: "photo", preview: "robotic-tech", photo: showcasePhotos.robot, palette: ["#062b49", "#f8fafc", "#53c1e9", "#ffffff"] },
  { id: "presentation-showcase-14", category: "presentation", name: "Robotics", sub: "Exploring intelligent machines", size: "Tech", layout: "clean", preview: "robotics-red", photo: showcasePhotos.circuit, palette: ["#c23b30", "#ffffff", "#c23b30", "#ffe6e0"] },
  { id: "presentation-showcase-15", category: "presentation", name: "Robotic", sub: "Start presentation", size: "Dark", layout: "photo", preview: "robotic-dark", photo: showcasePhotos.robotics, palette: ["#05080f", "#f8fafc", "#7c3aed", "#ffffff"] },
  { id: "presentation-showcase-16", category: "presentation", name: "Group Project", sub: "Rimberio Group", size: "Team", layout: "poster", preview: "group-project", photo: showcasePhotos.robot, palette: ["#151b76", "#f8fafc", "#a855f7", "#ffffff"] },
  { id: "presentation-showcase-17", category: "presentation", name: "Robotic", sub: "Startup product story", size: "Startup", layout: "split", preview: "robot-startup", photo: showcasePhotos.robot, palette: ["#090909", "#f8fafc", "#facc15", "#ffffff"] },
  { id: "presentation-showcase-18", category: "presentation", name: "Robotic Process Automation", sub: "For business", size: "01", layout: "photo", preview: "automation-blue", photo: showcasePhotos.robotics, palette: ["#163997", "#f8fafc", "#3b82f6", "#ffffff"] },
];

const showcasePosterTemplates = [
  { id: "poster-showcase-1", category: "poster", name: "Good Morning", sub: "Nature greeting poster", size: "Poster", layout: "photo", preview: "poster-morning", photo: photos[0], palette: ["#123c2c", "#f8fafc", "#f6d78f", "#ffffff"] },
  { id: "poster-showcase-2", category: "poster", name: "Custom Farming Solutions", sub: "Agriculture service flyer", size: "Flyer", layout: "clean", preview: "poster-farming-solutions", photo: showcasePhotos.crops, palette: ["#2f8f14", "#ffffff", "#62c826", "#e7f8de"] },
  { id: "poster-showcase-3", category: "poster", name: "National Farmer's Day", sub: "Celebration poster", size: "Festival", layout: "poster", preview: "poster-farmers-day", photo: showcasePhotos.vegetables, palette: ["#6b4a2e", "#dff4a6", "#7fb33d", "#fff5c2"] },
  { id: "poster-showcase-4", category: "poster", name: "Birthday Party", sub: "Event invite", size: "Invite", layout: "poster", preview: "poster-birthday-black", photo: photos[10], palette: ["#111111", "#ffffff", "#d7b56d", "#f9fafb"] },
  { id: "poster-showcase-5", category: "poster", name: "Hanuman Jayanti", sub: "Festival greeting", size: "Festival", layout: "poster", preview: "poster-hanuman-sunset", photo: photos[1], palette: ["#4b1e16", "#fff1d1", "#ff6a16", "#ffd447"] },
  { id: "poster-showcase-6", category: "poster", name: "Farming for the Future", sub: "Sustainable agriculture", size: "Infographic", layout: "dashboard", preview: "poster-farming-future", photo: showcasePhotos.fields, palette: ["#64705f", "#f8fafc", "#c9d4a4", "#ffffff"] },
  { id: "poster-showcase-7", category: "poster", name: "We Are Hiring", sub: "Recruitment poster", size: "Hiring", layout: "clean", preview: "poster-hiring-blue", photo: photos[9], palette: ["#4338ca", "#ffffff", "#facc15", "#ffffff"] },
  { id: "poster-showcase-8", category: "poster", name: "Early Bird Promo", sub: "Discount announcement", size: "Promo", layout: "poster", preview: "poster-early-bird", photo: photos[7], palette: ["#0949ce", "#ffffff", "#ff7a18", "#facc15"] },
  { id: "poster-showcase-9", category: "poster", name: "Smart Farming Technology", sub: "Innovation poster", size: "Tech", layout: "photo", preview: "poster-smart-farming", photo: showcasePhotos.fields, palette: ["#17391e", "#f8fafc", "#d9f99d", "#ffffff"] },
  { id: "poster-showcase-10", category: "poster", name: "House for Rent", sub: "Real estate poster", size: "Listing", layout: "clean", preview: "poster-house-rent", photo: photos[2], palette: ["#3f3f46", "#ffffff", "#a3a3a3", "#d6d3d1"] },
  { id: "poster-showcase-11", category: "poster", name: "Referral Program", sub: "Reward campaign", size: "Campaign", layout: "photo", preview: "poster-referral", photo: photos[9], palette: ["#075b22", "#ffffff", "#facc15", "#eef9ee"] },
  { id: "poster-showcase-12", category: "poster", name: "Mango Festival", sub: "Food celebration", size: "Festival", layout: "poster", preview: "poster-mango", photo: photos[4], palette: ["#16a34a", "#facc15", "#0f7a30", "#ffffff"] },
  { id: "poster-showcase-13", category: "poster", name: "Happy Navratri", sub: "Festival greeting", size: "Festival", layout: "poster", preview: "poster-navratri", photo: photos[3], palette: ["#8b1d1d", "#f4e8b5", "#d4a72c", "#ffffff"] },
  { id: "poster-showcase-14", category: "poster", name: "Agriculture in Society", sub: "Education poster", size: "Education", layout: "poster", preview: "poster-agri-society", photo: showcasePhotos.fields, palette: ["#0f766e", "#c9f3e6", "#22c55e", "#ffffff"] },
  { id: "poster-showcase-15", category: "poster", name: "Buy 1 Get 1 Free", sub: "Fashion sale", size: "Sale", layout: "clean", preview: "poster-fashion-sale", photo: photos[8], palette: ["#6f4e37", "#fffaf0", "#c19a6b", "#ffffff"] },
  { id: "poster-showcase-16", category: "poster", name: "Happy Baisakhi", sub: "Festival celebration", size: "Festival", layout: "poster", preview: "poster-baisakhi", photo: photos[5], palette: ["#b45309", "#fff7ed", "#f59e0b", "#ef4444"] },
  { id: "poster-showcase-17", category: "poster", name: "Summer Adventure", sub: "Travel promotion", size: "Travel", layout: "photo", preview: "poster-summer", photo: photos[1], palette: ["#0f4c81", "#ffffff", "#f59e0b", "#ffffff"] },
  { id: "poster-showcase-18", category: "poster", name: "Luxury Hotel", sub: "Hospitality offer", size: "Hotel", layout: "photo", preview: "poster-hotel", photo: photos[5], palette: ["#0f2a5f", "#ffffff", "#d4af37", "#ffffff"] },
  { id: "poster-showcase-19", category: "poster", name: "Harvest Festival", sub: "Community celebration", size: "Harvest", layout: "poster", preview: "poster-harvest", photo: showcasePhotos.fields, palette: ["#7c3f22", "#e0f2fe", "#f97316", "#ffffff"] },
  { id: "poster-showcase-20", category: "poster", name: "Organic Farming", sub: "Grow healthy", size: "Organic", layout: "clean", preview: "poster-organic", photo: showcasePhotos.farm, palette: ["#15803d", "#ffffff", "#facc15", "#eaffd0"] },
  { id: "poster-showcase-21", category: "poster", name: "We Are Hiring!", sub: "Content creator", size: "Hiring", layout: "poster", preview: "poster-hiring-cream", photo: photos[9], palette: ["#047857", "#fff7ed", "#ef4444", "#ffffff"] },
  { id: "poster-showcase-22", category: "poster", name: "Flash Sale", sub: "Fashion promo", size: "Sale", layout: "photo", preview: "poster-flash-sale", photo: photos[8], palette: ["#3f3f46", "#ffffff", "#94a3b8", "#ffffff"] },
  { id: "poster-showcase-23", category: "poster", name: "Rabindranath Tagore", sub: "Literary tribute", size: "Tribute", layout: "poster", preview: "poster-tagore", photo: photos[6], palette: ["#0f4163", "#ffffff", "#d4af37", "#ffffff"] },
  { id: "poster-showcase-24", category: "poster", name: "Krishna Janmashtami", sub: "Festival greeting", size: "Festival", layout: "poster", preview: "poster-krishna", photo: photos[3], palette: ["#f97316", "#fff7ed", "#b91c1c", "#facc15"] },
];

const showcaseSocialTemplates = [
  { id: "social-reel-1", category: "social", name: "Heaven", sub: "Mountain travel reel", size: "Reel", layout: "photo", preview: "social-heaven", socialSection: "reels", socialSize: "reel-card", photo: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80", palette: ["#0f2f3a", "#f8fafc", "#7dd3fc", "#ffffff"] },
  { id: "social-reel-2", category: "social", name: "Agriculture", sub: "Future farming reel", size: "Reel", layout: "photo", preview: "social-agriculture", socialSection: "reels", socialSize: "reel-card", photo: showcasePhotos.fields, palette: ["#3f3b22", "#f8fafc", "#f3e8a3", "#ffffff"] },
  { id: "social-reel-3", category: "social", name: "Daniel is Turning One", sub: "Kids birthday reel", size: "Reel", layout: "poster", preview: "social-birthday-kids", socialSection: "reels", socialSize: "reel-card", photo: photos[10], palette: ["#7a8f58", "#f1f5d9", "#f5d469", "#ffffff"] },
  { id: "social-reel-4", category: "social", name: "AN", sub: "Minimal wedding reel", size: "Reel", layout: "clean", preview: "social-wedding-minimal", socialSection: "reels", socialSize: "reel-card", photo: photos[6], palette: ["#c98296", "#ffffff", "#f7dbe3", "#ffffff"] },
  { id: "social-reel-5", category: "social", name: "Wedding Invitation", sub: "Blue floral invitation", size: "Reel", layout: "clean", preview: "social-wedding-blue", socialSection: "reels", socialSize: "reel-card", photo: photos[6], palette: ["#276f89", "#e8fbff", "#eabf58", "#ffffff"] },
  { id: "social-reel-6", category: "social", name: "Aaron is Turning One", sub: "Safari birthday reel", size: "Reel", layout: "poster", preview: "social-safari", socialSection: "reels", socialSize: "reel-card", photo: photos[4], palette: ["#d88934", "#fff8e7", "#84a98c", "#ffffff"] },
  { id: "social-reel-7", category: "social", name: "Wedding Invitation", sub: "Classic navy invite", size: "Reel", layout: "poster", preview: "social-wedding-navy", socialSection: "reels", socialSize: "reel-card", photo: photos[6], palette: ["#2d456a", "#f8fafc", "#d9e4f2", "#ffffff"] },
  { id: "social-reel-8", category: "social", name: "Do More of What You Love", sub: "Sunset quote reel", size: "Reel", layout: "photo", preview: "social-sunset-love", socialSection: "reels", socialSize: "reel-card", photo: photos[3], palette: ["#713f12", "#f8fafc", "#fbbf24", "#ffffff"] },
  { id: "social-reel-9", category: "social", name: "Shadow Story", sub: "Warm lifestyle reel", size: "Reel", layout: "photo", preview: "social-shadow", socialSection: "reels", socialSize: "reel-card", photo: photos[7], palette: ["#7a542d", "#f8fafc", "#f4c27d", "#ffffff"] },
  { id: "social-more-1", category: "social", name: "Sometimes all you need is the sea & sky", sub: "Ocean quote story", size: "Story", layout: "photo", preview: "social-sea-sky", socialSection: "more", socialSize: "story-card", photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80", palette: ["#2d3b55", "#f8fafc", "#f7c873", "#ffffff"] },
  { id: "social-more-2", category: "social", name: "True love grows", sub: "Nature quote story", size: "Story", layout: "photo", preview: "social-love-forest", socialSection: "more", socialSize: "story-card", photo: showcasePhotos.leaves, palette: ["#123024", "#f8fafc", "#86efac", "#ffffff"] },
  { id: "social-more-3", category: "social", name: "Frontend Web Design Workshop", sub: "Workshop banner", size: "Wide", layout: "clean", preview: "social-workshop-wide", socialSection: "more", socialSize: "wide-card", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80", palette: ["#153a59", "#ffffff", "#249ad4", "#ffffff"] },
  { id: "social-more-4", category: "social", name: "Join Our Team", sub: "Hiring banner", size: "Wide", layout: "clean", preview: "social-hiring-wide", socialSection: "more", socialSize: "wide-card", photo: photos[9], palette: ["#1f3a2d", "#f9f1df", "#b7cfb4", "#ffffff"] },
  { id: "social-more-5", category: "social", name: "Fertilization & Weed Control", sub: "Garden service post", size: "Wide", layout: "clean", preview: "social-weed-control", socialSection: "more", socialSize: "wide-card", photo: showcasePhotos.farm, palette: ["#2f8f14", "#ffffff", "#6fc044", "#ffffff"] },
  { id: "social-more-6", category: "social", name: "Plant Nursery Services", sub: "Nursery service post", size: "Wide", layout: "clean", preview: "social-nursery", socialSection: "more", socialSize: "wide-card", photo: showcasePhotos.crops, palette: ["#14532d", "#ffffff", "#f6b21a", "#ffffff"] },
  { id: "social-more-7", category: "social", name: "Life", sub: "Waterfall quote reel", size: "Reel", layout: "photo", preview: "social-life-waterfall", socialSection: "more", socialSize: "reel-card", photo: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=900&q=80", palette: ["#17271c", "#f8fafc", "#b7d6c1", "#ffffff"] },
  { id: "social-more-8", category: "social", name: "Make Yourself Seen and Heard", sub: "Leaf quote post", size: "Square", layout: "photo", preview: "social-leaf-quote", socialSection: "more", socialSize: "square-card", photo: showcasePhotos.leaves, palette: ["#112a22", "#f8fafc", "#9ccc7d", "#ffffff"] },
  { id: "social-more-9", category: "social", name: "Home Painting Service", sub: "Service ad banner", size: "Wide", layout: "clean", preview: "social-painting", socialSection: "more", socialSize: "wide-card", photo: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80", palette: ["#c9042d", "#ffffff", "#ef4444", "#ffffff"] },
  { id: "social-more-10", category: "social", name: "108 Hanuman Chalisa Path", sub: "Festival invitation", size: "Square", layout: "poster", preview: "social-hanuman-path", socialSection: "more", socialSize: "square-card", photo: photos[1], palette: ["#b91c1c", "#facc15", "#f97316", "#ffffff"] },
  { id: "social-more-11", category: "social", name: "Reminder", sub: "Soft field reminder", size: "Reel", layout: "photo", preview: "social-reminder", socialSection: "more", socialSize: "reel-card", photo: photos[6], palette: ["#6d5138", "#f8fafc", "#f5b169", "#ffffff"] },
  { id: "social-more-12", category: "social", name: "Stay inspired", sub: "Quote card", size: "Reel", layout: "photo", preview: "social-inspired", socialSection: "more", socialSize: "reel-card", photo: photos[3], palette: ["#23415f", "#f8fafc", "#2ba4d8", "#ffffff"] },
];

const showcaseStoryTemplates = [
  { id: "story-showcase-1", category: "story", name: "No Risk, No Story", sub: "Wildflower photo story", size: "Story", layout: "photo", preview: "story-wildflower", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?auto=format&fit=crop&w=900&q=80", palette: ["#2f3a35", "#f8fafc", "#d9dee1", "#ffffff"] },
  { id: "story-showcase-2", category: "story", name: "Our Story", sub: "Romantic collage", size: "Story", layout: "clean", preview: "story-our-story", storyFeatured: true, storySize: "story-square", photo: photos[10], palette: ["#202020", "#f4efe7", "#ff6094", "#ffffff"] },
  { id: "story-showcase-3", category: "story", name: "About Me", sub: "Editorial profile", size: "Story", layout: "clean", preview: "story-about-me", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80", palette: ["#332f2e", "#ebe6df", "#d1c7bf", "#ffffff"] },
  { id: "story-showcase-4", category: "story", name: "World Storytelling Day", sub: "Illustrated event", size: "Story", layout: "poster", preview: "story-storytelling-day", storyFeatured: true, storySize: "story-square", photo: photos[7], palette: ["#dc2626", "#fff0df", "#fb7185", "#ffffff"] },
  { id: "story-showcase-5", category: "story", name: "Celebrate Moments", sub: "Black and white triptych", size: "Story", layout: "photo", preview: "story-celebrate", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80", palette: ["#111111", "#f8fafc", "#d1d5db", "#ffffff"] },
  { id: "story-showcase-6", category: "story", name: "One Place", sub: "Beach memory story", size: "Story", layout: "photo", preview: "story-one-place", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80", palette: ["#3d3320", "#f8fafc", "#facc15", "#ffffff"] },
  { id: "story-showcase-7", category: "story", name: "Polaroid Story", sub: "Travel scrapbook", size: "Story", layout: "clean", preview: "story-polaroid", storyFeatured: true, storySize: "story-square", photo: photos[3], palette: ["#234e52", "#d5f2ee", "#ef4444", "#ffffff"] },
  { id: "story-showcase-8", category: "story", name: "The Grain Shop", sub: "Shop editorial story", size: "Story", layout: "clean", preview: "story-grain-shop", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80", palette: ["#5b4634", "#f4eadc", "#d94b73", "#ffffff"] },
  { id: "story-showcase-9", category: "story", name: "Black Photo Essay", sub: "Monochrome visual story", size: "Story", layout: "photo", preview: "story-black-essay", storyFeatured: true, storySize: "story-square", photo: photos[8], palette: ["#050505", "#f8fafc", "#6b7280", "#ffffff"] },
  { id: "story-showcase-10", category: "story", name: "Stories Between Miles", sub: "Road trip story", size: "Story", layout: "photo", preview: "story-between-miles", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80", palette: ["#17251c", "#f8fafc", "#c8d6c0", "#ffffff"] },
  { id: "story-showcase-11", category: "story", name: "Cinematic Composition", sub: "Film moodboard", size: "Story", layout: "photo", preview: "story-cinematic", storyFeatured: true, storySize: "story-vertical", photo: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80", palette: ["#111827", "#f8fafc", "#facc15", "#ffffff"] },
  { id: "story-showcase-12", category: "story", name: "Success Story", sub: "Consultant profile", size: "Story", layout: "clean", preview: "story-success-profile", storyFeatured: true, storySize: "story-vertical", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80", palette: ["#4c1d95", "#f7f3ff", "#a78bfa", "#ffffff"] },
  { id: "story-showcase-13", category: "story", name: "One Journey, Many Lessons", sub: "Travel lesson story", size: "Story", layout: "photo", preview: "story-many-lessons", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80", palette: ["#2b241b", "#f8fafc", "#facc15", "#ffffff"] },
  { id: "story-showcase-14", category: "story", name: "Sponsored Content", sub: "Creator editorial", size: "Story", layout: "clean", preview: "story-sponsored", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=900&q=80", palette: ["#3d352d", "#dce4e5", "#8b735f", "#ffffff"] },
  { id: "story-showcase-15", category: "story", name: "My First Experience", sub: "Freelance story", size: "Story", layout: "photo", preview: "story-first-experience", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80", palette: ["#2b231d", "#f8fafc", "#ffffff", "#ffffff"] },
  { id: "story-showcase-16", category: "story", name: "My Success Story", sub: "Magazine spread", size: "Story", layout: "clean", preview: "story-success-paper", storyFeatured: true, storySize: "story-square", photo: photos[8], palette: ["#111827", "#f4f4f0", "#ef4444", "#ffffff"] },
  { id: "story-showcase-17", category: "story", name: "Season of Your Story", sub: "Photo grid memory", size: "Story", layout: "clean", preview: "story-season-grid", storyFeatured: true, storySize: "story-square", photo: photos[10], palette: ["#1f3d2d", "#f8fafc", "#93c5a7", "#ffffff"] },
  { id: "story-showcase-18", category: "story", name: "Your story is still being written", sub: "Handwritten quote", size: "Story", layout: "clean", preview: "story-written", storyFeatured: true, storySize: "story-square", photo: photos[6], palette: ["#6b4c1d", "#fbfaf7", "#111827", "#ffffff"] },
  { id: "story-showcase-19", category: "story", name: "Forest Story The Ranger", sub: "Nature article card", size: "Story", layout: "clean", preview: "story-ranger", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80", palette: ["#294524", "#fbf7d8", "#b6d7ee", "#ffffff"] },
  { id: "story-showcase-20", category: "story", name: "Coming Soon", sub: "Launch countdown", size: "Story", layout: "photo", preview: "story-coming-soon", storyFeatured: true, storySize: "story-square", photo: photos[11], palette: ["#090909", "#f8fafc", "#f59e0b", "#ffffff"] },
  { id: "story-showcase-21", category: "story", name: "The Magic of the Sea", sub: "Minimal essay", size: "Story", layout: "clean", preview: "story-magic-sea", storyFeatured: true, storySize: "story-square", photo: photos[3], palette: ["#2e241f", "#f3eadb", "#6b5b4b", "#ffffff"] },
  { id: "story-showcase-22", category: "story", name: "About Us", sub: "Studio profile", size: "Story", layout: "clean", preview: "story-about-us", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80", palette: ["#181818", "#ffffff", "#d7d7d7", "#ffffff"] },
  { id: "story-showcase-23", category: "story", name: "Trying Something New", sub: "Creator work story", size: "Story", layout: "photo", preview: "story-something-new", storyFeatured: true, storySize: "story-square", photo: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80", palette: ["#28302c", "#f8fafc", "#d2b083", "#ffffff"] },
  { id: "story-showcase-24", category: "story", name: "What Success Started To Mean To Me", sub: "Growth story cover", size: "Story", layout: "photo", preview: "story-success-meaning", storyFeatured: true, storySize: "story-square", photo: photos[11], palette: ["#30302e", "#f8fafc", "#ffffff", "#ffffff"] },
];

const showcaseBusinessTemplates = [
  { id: "business-showcase-1", category: "business", name: "Grow Up Your Business", sub: "Corporate growth ad", size: "Business", layout: "clean", preview: "business-grow-green", businessFeatured: true, businessSize: "business-square", photo: photos[9], palette: ["#008f78", "#ffffff", "#08d6b2", "#ffffff"] },
  { id: "business-showcase-2", category: "business", name: "Digital Marketing", sub: "Agency proposal", size: "Business", layout: "clean", preview: "business-digital-orange", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=80", palette: ["#fb4b14", "#f7f7f7", "#ff7a1a", "#ffffff"] },
  { id: "business-showcase-3", category: "business", name: "Need a Business Loan?", sub: "Finance campaign", size: "Business", layout: "photo", preview: "business-loan", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80", palette: ["#5b5cff", "#ffffff", "#facc15", "#ffffff"] },
  { id: "business-showcase-4", category: "business", name: "Business Services", sub: "Consulting service menu", size: "Business", layout: "clean", preview: "business-services-blue", businessFeatured: true, businessSize: "business-wide", photo: photos[9], palette: ["#101e54", "#ffffff", "#6b4a9d", "#ffffff"] },
  { id: "business-showcase-5", category: "business", name: "Online Business Webinar", sub: "Webinar promotion", size: "Business", layout: "photo", preview: "business-webinar", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80", palette: ["#064e3b", "#f8fafc", "#2dd4bf", "#ffffff"] },
  { id: "business-showcase-6", category: "business", name: "Creative Business Agency", sub: "Agency services", size: "Business", layout: "clean", preview: "business-creative-navy", businessFeatured: true, businessSize: "business-square", photo: photos[10], palette: ["#0f172a", "#ffffff", "#fbbf24", "#ffffff"] },
  { id: "business-showcase-7", category: "business", name: "Business Consulting Online Services", sub: "Consultant banner", size: "Business", layout: "photo", preview: "business-consulting-wide", businessFeatured: true, businessSize: "business-wide", photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80", palette: ["#0b3752", "#f8fafc", "#38bdf8", "#ffffff"] },
  { id: "business-showcase-8", category: "business", name: "A Business Grows When Its People Grow First.", sub: "Leadership quote", size: "Business", layout: "poster", preview: "business-quote-teal", businessFeatured: true, businessSize: "business-square", photo: photos[11], palette: ["#111111", "#76dbc7", "#0f172a", "#ffffff"] },
  { id: "business-showcase-9", category: "business", name: "Creative Business Agency", sub: "Service agency post", size: "Business", layout: "clean", preview: "business-agency-blue", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80", palette: ["#0f63b6", "#fff8df", "#facc15", "#ffffff"] },
  { id: "business-showcase-10", category: "business", name: "How to Grow Your Business", sub: "Strategy webinar", size: "Business", layout: "photo", preview: "business-grow-chart", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80", palette: ["#0b2e5f", "#f8fafc", "#38bdf8", "#ffffff"] },
  { id: "business-showcase-11", category: "business", name: "Innovative Business Solutions", sub: "Corporate solutions", size: "Business", layout: "clean", preview: "business-solutions", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1580894894513-541e068a3e2b?auto=format&fit=crop&w=900&q=80", palette: ["#0b4a7a", "#ffffff", "#38bdf8", "#ffffff"] },
  { id: "business-showcase-12", category: "business", name: "Professional Business Consultant", sub: "Consulting profile", size: "Business", layout: "clean", preview: "business-consultant", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80", palette: ["#0b2545", "#f8fafc", "#fbbf24", "#ffffff"] },
  { id: "business-showcase-13", category: "business", name: "Best Choice for Digital Marketing Agency", sub: "Marketing pitch", size: "Business", layout: "clean", preview: "business-best-choice", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=80", palette: ["#111827", "#ffffff", "#6d86ff", "#ffffff"] },
  { id: "business-showcase-14", category: "business", name: "Grow Your Business With Us", sub: "Office listing", size: "Business", layout: "clean", preview: "business-locations", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80", palette: ["#a06d2d", "#ffffff", "#d49a42", "#ffffff"] },
  { id: "business-showcase-15", category: "business", name: "Grow Your Business", sub: "Company promotion", size: "Business", layout: "clean", preview: "business-grow-blue", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80", palette: ["#0f2f5f", "#ffffff", "#fb923c", "#ffffff"] },
  { id: "business-showcase-16", category: "business", name: "Creative Business Talk", sub: "Speaker event", size: "Business", layout: "clean", preview: "business-talk", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80", palette: ["#222222", "#ffffff", "#fb7c36", "#ffffff"] },
  { id: "business-showcase-17", category: "business", name: "Quote", sub: "Founder quote card", size: "Business", layout: "poster", preview: "business-quote-black", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80", palette: ["#050505", "#f8fafc", "#facc15", "#ffffff"] },
  { id: "business-showcase-18", category: "business", name: "3 Tips For Expanding Your Business", sub: "Business tips", size: "Business", layout: "poster", preview: "business-three-tips", businessFeatured: true, businessSize: "business-square", photo: photos[11], palette: ["#090909", "#f8fafc", "#22c55e", "#ffffff"] },
  { id: "business-showcase-19", category: "business", name: "Future-Proof Your Business", sub: "Consulting services", size: "Business", layout: "clean", preview: "business-future-proof", businessFeatured: true, businessSize: "business-square", photo: photos[9], palette: ["#173b85", "#ffffff", "#9bbcff", "#ffffff"] },
  { id: "business-showcase-20", category: "business", name: "Building Stronger Workplace Relationships", sub: "Workplace article", size: "Business", layout: "photo", preview: "business-workplace", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80", palette: ["#2b241d", "#f8fafc", "#a78b6f", "#ffffff"] },
  { id: "business-showcase-21", category: "business", name: "Business Strategy", sub: "Executive workshop", size: "Business", layout: "photo", preview: "business-strategy", businessFeatured: true, businessSize: "business-wide", photo: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80", palette: ["#0f172a", "#f8fafc", "#22d3ee", "#ffffff"] },
  { id: "business-showcase-22", category: "business", name: "Corporate Finance", sub: "Finance planning post", size: "Business", layout: "clean", preview: "business-finance", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=80", palette: ["#1e3a8a", "#ffffff", "#f59e0b", "#ffffff"] },
  { id: "business-showcase-23", category: "business", name: "Business Planning", sub: "Planning cover", size: "Business", layout: "clean", preview: "business-planning", businessFeatured: true, businessSize: "business-square", photo: photos[9], palette: ["#134e4a", "#ffffff", "#2dd4bf", "#ffffff"] },
  { id: "business-showcase-24", category: "business", name: "Market Growth", sub: "Growth report", size: "Business", layout: "photo", preview: "business-market-growth", businessFeatured: true, businessSize: "business-square", photo: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80", palette: ["#111827", "#f8fafc", "#10b981", "#ffffff"] },
];

const showcaseInvitationTemplates = [
  { id: "invitation-showcase-1", category: "invitation", name: "Angel's Birthday Party", sub: "Champagne birthday invite", size: "Invitation", layout: "photo", preview: "invite-gold-birthday", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=80", palette: ["#3a2b17", "#fff7ed", "#d4a43a", "#ffffff"] },
  { id: "invitation-showcase-2", category: "invitation", name: "Emma is Turning 6", sub: "Kids birthday celebration", size: "Invitation", layout: "poster", preview: "invite-kids-balloon", invitationFeatured: true, invitationSize: "invite-card", photo: photos[10], palette: ["#d9468f", "#f4e7ff", "#f59ec7", "#ffffff"] },
  { id: "invitation-showcase-3", category: "invitation", name: "Graduation Party", sub: "Class of 2025", size: "Invitation", layout: "clean", preview: "invite-grad-botanical", invitationFeatured: true, invitationSize: "invite-wide", photo: photos[11], palette: ["#2f594a", "#f5eddc", "#8aae82", "#ffffff"] },
  { id: "invitation-showcase-4", category: "invitation", name: "Class of 25", sub: "Graduation photo invite", size: "Invitation", layout: "photo", preview: "invite-grad-photo-dark", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80", palette: ["#251f19", "#f8fafc", "#d4af37", "#ffffff"] },
  { id: "invitation-showcase-5", category: "invitation", name: "The Wedding", sub: "Couple photo invitation", size: "Invitation", layout: "photo", preview: "invite-wedding-photo", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80", palette: ["#f7f4ee", "#f8fafc", "#ffffff", "#ffffff"] },
  { id: "invitation-showcase-6", category: "invitation", name: "Birthday Party", sub: "Hand drawn birthday invite", size: "Invitation", layout: "clean", preview: "invite-doodle-birthday", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#e07070", "#fff7ed", "#f9a8d4", "#ffffff"] },
  { id: "invitation-showcase-7", category: "invitation", name: "Olivia Richard and Alexander Williams", sub: "Minimal wedding ceremony", size: "Invitation", layout: "clean", preview: "invite-minimal-wedding", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#2d2d2d", "#fbfaf4", "#d1d5db", "#ffffff"] },
  { id: "invitation-showcase-8", category: "invitation", name: "Olivia & Daniel", sub: "Blue floral wedding", size: "Invitation", layout: "clean", preview: "invite-blue-floral", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80", palette: ["#3b5f86", "#eef7fb", "#9bc4df", "#ffffff"] },
  { id: "invitation-showcase-9", category: "invitation", name: "Let's Party", sub: "Pink birthday cake", size: "Invitation", layout: "photo", preview: "invite-pink-cake", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80", palette: ["#c02673", "#fff1f5", "#f9a8d4", "#ffffff"] },
  { id: "invitation-showcase-10", category: "invitation", name: "Baptism of Estelle Darcy", sub: "Soft floral baptism", size: "Invitation", layout: "clean", preview: "invite-baptism-wide", invitationFeatured: true, invitationSize: "invite-wide", photo: "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?auto=format&fit=crop&w=900&q=80", palette: ["#ad3fa3", "#fff7fb", "#d4af37", "#ffffff"] },
  { id: "invitation-showcase-11", category: "invitation", name: "Farha Hasan", sub: "Floral Nikah invitation", size: "Invitation", layout: "clean", preview: "invite-nikah-pink", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#8b4a4a", "#fffaf7", "#e7b7bc", "#ffffff"] },
  { id: "invitation-showcase-12", category: "invitation", name: "Daniel Olivia & Marcelle Wilson", sub: "White floral wedding", size: "Invitation", layout: "clean", preview: "invite-white-floral", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#6b6b52", "#f9f6ee", "#d9e4c8", "#ffffff"] },
  { id: "invitation-showcase-13", category: "invitation", name: "Rachel's Birthday Party", sub: "Garden birthday party", size: "Invitation", layout: "clean", preview: "invite-garden-birthday", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#6a681d", "#fffdf2", "#e779a7", "#ffffff"] },
  { id: "invitation-showcase-14", category: "invitation", name: "Graduation Party Class of 2024", sub: "Black and gold graduation", size: "Invitation", layout: "poster", preview: "invite-grad-black-gold", invitationFeatured: true, invitationSize: "invite-card", photo: photos[11], palette: ["#17120b", "#fffaf0", "#c9a445", "#ffffff"] },
  { id: "invitation-showcase-15", category: "invitation", name: "Jacqueline Eleanor", sub: "Romantic floral wedding", size: "Invitation", layout: "clean", preview: "invite-romantic-floral", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#9b7a42", "#fff5df", "#f4b8bb", "#ffffff"] },
  { id: "invitation-showcase-16", category: "invitation", name: "Graduate Avery Davis", sub: "Photo graduation invite", size: "Invitation", layout: "clean", preview: "invite-grad-polaroid", invitationFeatured: true, invitationSize: "invite-card", photo: photos[11], palette: ["#43372b", "#f8f4ea", "#111827", "#ffffff"] },
  { id: "invitation-showcase-17", category: "invitation", name: "Dinner Party", sub: "Black squiggle dinner invite", size: "Invitation", layout: "clean", preview: "invite-dinner-squiggle", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#111111", "#f3eadb", "#d7c6b0", "#ffffff"] },
  { id: "invitation-showcase-18", category: "invitation", name: "She did it!", sub: "Graduation party photo invite", size: "Invitation", layout: "photo", preview: "invite-she-did-it", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80", palette: ["#111111", "#f8fafc", "#ffffff", "#ffffff"] },
  { id: "invitation-showcase-19", category: "invitation", name: "Juliana Silva & Murat Naser", sub: "Blue floral wedding", size: "Invitation", layout: "clean", preview: "invite-blue-wedding", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#27436f", "#f8fafc", "#9fb8de", "#ffffff"] },
  { id: "invitation-showcase-20", category: "invitation", name: "Save the Date Sarah Michael", sub: "Green floral save the date", size: "Invitation", layout: "clean", preview: "invite-save-date-green", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#738c74", "#fbfdf9", "#bdd9c5", "#ffffff"] },
  { id: "invitation-showcase-21", category: "invitation", name: "Morgan Maxwell Birthday Party", sub: "Black and gold birthday", size: "Invitation", layout: "poster", preview: "invite-black-gold-birthday", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#050505", "#f8fafc", "#facc15", "#ffffff"] },
  { id: "invitation-showcase-22", category: "invitation", name: "Jonathan + Juliana", sub: "Blue line wedding invite", size: "Invitation", layout: "clean", preview: "invite-blue-line", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#385170", "#ffffff", "#c7d7ea", "#ffffff"] },
  { id: "invitation-showcase-23", category: "invitation", name: "Marianne and Joshua", sub: "Minimal botanical wedding", size: "Invitation", layout: "clean", preview: "invite-minimal-botanical", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#a88e7d", "#fffdf9", "#e6d6ca", "#ffffff"] },
  { id: "invitation-showcase-24", category: "invitation", name: "Gwyneth & Arth's", sub: "Orange beach wedding", size: "Invitation", layout: "clean", preview: "invite-orange-wedding", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#d65a1f", "#fff8e8", "#3f7d5a", "#ffffff"] },
  { id: "invitation-showcase-25", category: "invitation", name: "Samira & Ahmad", sub: "Navy floral save the date", size: "Invitation", layout: "clean", preview: "invite-navy-floral", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#113a5c", "#f8fafc", "#f0a3bb", "#ffffff"] },
  { id: "invitation-showcase-26", category: "invitation", name: "The Families of Amina & Omar", sub: "Gold arch wedding", size: "Invitation", layout: "clean", preview: "invite-gold-arch", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#a17725", "#fffdfa", "#d9bf75", "#ffffff"] },
  { id: "invitation-showcase-27", category: "invitation", name: "Olivia Wilson Graduation Party", sub: "Graduation photo card", size: "Invitation", layout: "clean", preview: "invite-grad-photo-white", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80", palette: ["#2a2a2a", "#f7f7f7", "#d1b58a", "#ffffff"] },
  { id: "invitation-showcase-28", category: "invitation", name: "Samira & Habib", sub: "Soft pink wedding", size: "Invitation", layout: "clean", preview: "invite-pink-wedding", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#4a3d35", "#fff0f0", "#efb6b6", "#ffffff"] },
  { id: "invitation-showcase-29", category: "invitation", name: "Bridal Shower for Olivia Wilson", sub: "Pink bridal shower", size: "Invitation", layout: "clean", preview: "invite-bridal-shower", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#c65f5f", "#fffdf9", "#efb6a8", "#ffffff"] },
  { id: "invitation-showcase-30", category: "invitation", name: "Graduation Party!", sub: "Hand drawn graduation", size: "Invitation", layout: "clean", preview: "invite-hand-grad", invitationFeatured: true, invitationSize: "invite-card", photo: photos[11], palette: ["#111111", "#eeeeee", "#d1d5db", "#ffffff"] },
  { id: "invitation-showcase-31", category: "invitation", name: "Henrietta Mitchell and Richard Sanchez", sub: "Minimal monogram wedding", size: "Invitation", layout: "clean", preview: "invite-monogram", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#4b4b4b", "#ffffff", "#d1d5db", "#ffffff"] },
  { id: "invitation-showcase-32", category: "invitation", name: "Maisie & Allan", sub: "Leaf wedding invitation", size: "Invitation", layout: "photo", preview: "invite-leaf-wedding", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80", palette: ["#c0256b", "#fff1f2", "#d97706", "#ffffff"] },
  { id: "invitation-showcase-33", category: "invitation", name: "Brides, officially", sub: "Engagement party flowers", size: "Invitation", layout: "clean", preview: "invite-engagement-floral", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#15803d", "#fffaf0", "#ef9bb8", "#ffffff"] },
  { id: "invitation-showcase-34", category: "invitation", name: "Graduation Party Richard Sanchez", sub: "Simple graduation party", size: "Invitation", layout: "clean", preview: "invite-grad-simple", invitationFeatured: true, invitationSize: "invite-card", photo: photos[11], palette: ["#3f4f3a", "#fffef7", "#9aa887", "#ffffff"] },
  { id: "invitation-showcase-35", category: "invitation", name: "Alexander & Juliana", sub: "Ornate wedding invite", size: "Invitation", layout: "clean", preview: "invite-ornate-wedding", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#756052", "#f8f4e9", "#d6c0a8", "#ffffff"] },
  { id: "invitation-showcase-36", category: "invitation", name: "Olivia Wilson", sub: "Photo birthday invitation", size: "Invitation", layout: "clean", preview: "invite-photo-birthday", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80", palette: ["#222222", "#faf7f2", "#d8cabc", "#ffffff"] },
  { id: "invitation-showcase-37", category: "invitation", name: "Sebastian 6", sub: "Comic birthday party", size: "Invitation", layout: "poster", preview: "invite-comic-birthday", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#111827", "#facc15", "#ef4444", "#ffffff"] },
  { id: "invitation-showcase-38", category: "invitation", name: "Taleem Rauf & Farha Hasan", sub: "Blue Nikah ceremony", size: "Invitation", layout: "clean", preview: "invite-blue-nikah", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#425f8a", "#f8fafc", "#a8c5e8", "#ffffff"] },
  { id: "invitation-showcase-39", category: "invitation", name: "Olivia's Graduation Ceremony", sub: "Black graduation ceremony", size: "Invitation", layout: "photo", preview: "invite-black-grad-photo", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80", palette: ["#090909", "#f8fafc", "#d4af37", "#ffffff"] },
  { id: "invitation-showcase-40", category: "invitation", name: "Anna & Aido", sub: "Maroon wedding invitation", size: "Invitation", layout: "poster", preview: "invite-maroon-wedding", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#6b0f1a", "#fff7ed", "#d4af37", "#ffffff"] },
  { id: "invitation-showcase-41", category: "invitation", name: "Sacha's 18th Birthday", sub: "Red line birthday", size: "Invitation", layout: "clean", preview: "invite-red-birthday", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#be123c", "#fffdf7", "#f3a0b7", "#ffffff"] },
  { id: "invitation-showcase-42", category: "invitation", name: "First Holy Communion", sub: "Blue communion invite", size: "Invitation", layout: "clean", preview: "invite-communion", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#b58b24", "#eff8ff", "#93c5fd", "#ffffff"] },
  { id: "invitation-showcase-43", category: "invitation", name: "My Birthday", sub: "Pink party collage", size: "Invitation", layout: "poster", preview: "invite-pink-collage", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#d9468f", "#fdf2f8", "#f9a8d4", "#ffffff"] },
  { id: "invitation-showcase-44", category: "invitation", name: "Happy Birthday Sophie", sub: "Disco birthday collage", size: "Invitation", layout: "poster", preview: "invite-disco-birthday", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#6b8e23", "#f8fafc", "#ec4899", "#ffffff"] },
  { id: "invitation-showcase-45", category: "invitation", name: "Madison Graduation Party", sub: "Minimal graduation invitation", size: "Invitation", layout: "clean", preview: "invite-madison-grad", invitationFeatured: true, invitationSize: "invite-card", photo: photos[11], palette: ["#353535", "#fffef7", "#d4af37", "#ffffff"] },
  { id: "invitation-showcase-46", category: "invitation", name: "Dinner Party", sub: "Red dinner party invite", size: "Invitation", layout: "clean", preview: "invite-red-dinner", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#b91c1c", "#fff8f5", "#ef8a8a", "#ffffff"] },
  { id: "invitation-showcase-47", category: "invitation", name: "Graduate Avery Davis", sub: "Modern graduation party", size: "Invitation", layout: "clean", preview: "invite-grad-2024", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80", palette: ["#7a6b55", "#ffffff", "#d1d5db", "#ffffff"] },
  { id: "invitation-showcase-48", category: "invitation", name: "Nikah Nigo", sub: "Green wedding invitation", size: "Invitation", layout: "poster", preview: "invite-green-nikah", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#6f806b", "#f8fafc", "#d8e6d0", "#ffffff"] },
  { id: "invitation-showcase-49", category: "invitation", name: "Sophia's First Birthday", sub: "Baby first birthday", size: "Invitation", layout: "clean", preview: "invite-baby-bow", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#c17761", "#fffaf5", "#f2c6c4", "#ffffff"] },
  { id: "invitation-showcase-50", category: "invitation", name: "Baby Shower", sub: "Neutral baby shower", size: "Invitation", layout: "clean", preview: "invite-baby-shower", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#bd7b4f", "#fffdfb", "#f1d2bd", "#ffffff"] },
  { id: "invitation-showcase-51", category: "invitation", name: "Party Time", sub: "Neon birthday party", size: "Invitation", layout: "poster", preview: "invite-neon-party", invitationFeatured: true, invitationSize: "invite-wide", photo: photos[7], palette: ["#050505", "#f8fafc", "#67e8f9", "#ffffff"] },
  { id: "invitation-showcase-52", category: "invitation", name: "Graduation Party", sub: "Classic graduation invite", size: "Invitation", layout: "poster", preview: "invite-classic-grad", invitationFeatured: true, invitationSize: "invite-card", photo: photos[11], palette: ["#111111", "#fff7ed", "#fbbf24", "#ffffff"] },
  { id: "invitation-showcase-53", category: "invitation", name: "Olivia and Alexander", sub: "Green stem wedding", size: "Invitation", layout: "clean", preview: "invite-green-stem", invitationFeatured: true, invitationSize: "invite-card", photo: photos[6], palette: ["#7d8f51", "#fffef8", "#cbd5a5", "#ffffff"] },
  { id: "invitation-showcase-54", category: "invitation", name: "Olivia & Richard", sub: "Collage wedding invite", size: "Invitation", layout: "photo", preview: "invite-collage-wedding", invitationFeatured: true, invitationSize: "invite-card", photo: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80", palette: ["#704f39", "#f8fafc", "#d6a575", "#ffffff"] },
  { id: "invitation-showcase-55", category: "invitation", name: "Giggling Platypus", sub: "Event poster invite", size: "Invitation", layout: "poster", preview: "invite-modern-event", invitationFeatured: true, invitationSize: "invite-card", photo: photos[7], palette: ["#111827", "#f4f4f4", "#f59e0b", "#ffffff"] },
  { id: "invitation-showcase-56", category: "invitation", name: "Olivia's Birthday Party", sub: "Cake sketch invite", size: "Invitation", layout: "clean", preview: "invite-cake-sketch", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#111111", "#fff8ef", "#d7c1ac", "#ffffff"] },
  { id: "invitation-showcase-57", category: "invitation", name: "Olivia's 21st Birthday", sub: "Blue stripe birthday", size: "Invitation", layout: "clean", preview: "invite-blue-stripe", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#ef7b45", "#e7f1ff", "#7fb5e8", "#ffffff"] },
  { id: "invitation-showcase-58", category: "invitation", name: "Pool Party", sub: "Summer pool invite", size: "Invitation", layout: "poster", preview: "invite-pool-party", invitationFeatured: true, invitationSize: "invite-card", photo: photos[7], palette: ["#0ea5e9", "#f8fafc", "#f97316", "#ffffff"] },
  { id: "invitation-showcase-59", category: "invitation", name: "Juliana's Birthday Party", sub: "Balloon birthday invite", size: "Invitation", layout: "poster", preview: "invite-balloon-party", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#6d28d9", "#f8fafc", "#facc15", "#ffffff"] },
  { id: "invitation-showcase-60", category: "invitation", name: "Sebastian 1st Birthday", sub: "Race car birthday", size: "Invitation", layout: "poster", preview: "invite-race-birthday", invitationFeatured: true, invitationSize: "invite-card", photo: photos[4], palette: ["#050505", "#ffffff", "#ef4444", "#ffffff"] },
];

const showcaseChartTemplates = [
  ["chart-market-share", "Market Share Comparison of Smartphone Brands", "Vertical bar chart", "bar", ["#111827", "#ffffff", "#c2185b", "#22d3ee"]],
  ["chart-pie-3d", "Pie Chart", "Bold 3D pie composition", "pie", ["#15183c", "#ffffff", "#facc15", "#8b3dff"]],
  ["chart-social-tiers", "Social Media Follower Tiers", "Tiered column chart", "tier", ["#f8eee6", "#111827", "#fb7185", "#c084fc"]],
  ["chart-sales-report", "Sales Performance Report", "Report dashboard", "dashboard", ["#eef2ff", "#111827", "#2563eb", "#8b3dff"]],
  ["chart-automation", "Predictive Process Automation", "Circular process map", "process", ["#f8fafc", "#111827", "#0ea5e9", "#84cc16"]],
  ["chart-business-steps", "Steps to Build a Business from Scratch", "Timeline infographic", "steps", ["#20222c", "#ffffff", "#38bdf8", "#f97316"]],
  ["chart-chore", "My Chore Charts every day", "Printable chore table", "table", ["#fff7f4", "#5b5151", "#f2b8aa", "#ffffff"]],
  ["chart-business-charts", "Business Charts", "Sketch chart collection", "sketch", ["#f8fafc", "#111827", "#a3ff4f", "#64748b"]],
  ["chart-expenses", "Expenses", "Donut expense chart", "donut", ["#f8fafc", "#29336b", "#38bdf8", "#6366f1"]],
  ["chart-coffee", "Coffee Culture", "Horizontal survey bars", "horizontal", ["#d8f8fb", "#111827", "#22c7d7", "#1d75b9"]],
  ["chart-app-usage", "Statistics on App Usage", "Usage analytics dashboard", "stats", ["#ffffff", "#111827", "#3dd6df", "#0e5d91"]],
  ["chart-comparison", "Comparison Chart", "Plan comparison table", "compare", ["#ffffff", "#64748b", "#f9c5a5", "#67e8f9"]],
  ["chart-success", "The Marriage of Success and Happiness", "Hexagon relationship chart", "hex", ["#181818", "#ffffff", "#2dd4bf", "#0ea5e9"]],
  ["chart-thirst", "Quench Your Thirst", "Beverage donut chart", "donut", ["#ffffff", "#111827", "#41c7d5", "#725187"]],
  ["chart-org-company", "Company Organizational Chart", "Company org hierarchy", "org", ["#ffffff", "#111827", "#6d33f5", "#c4a2ff"]],
  ["chart-sales-pie", "Borcelle Company Sales Report 2024", "Pie report layout", "pie-report", ["#f4f4f4", "#111827", "#67d8f0", "#e24aa8"]],
  ["chart-research-stages", "The Stages of Research", "Research checklist", "research", ["#ffffff", "#111827", "#e879f9", "#86198f"]],
  ["chart-swot", "SWOT", "SWOT matrix", "swot", ["#ffffff", "#111827", "#7c6199", "#c4a2dd"]],
  ["chart-research-process", "The Stages of Research", "Circular research process", "process-line", ["#ffffff", "#111827", "#2dd4bf", "#0e5d91"]],
  ["chart-marketing", "Business Marketing Presentation", "Blue marketing cover", "cover", ["#f8fafc", "#2563eb", "#4ade80", "#60a5fa"]],
  ["chart-swimwear", "Wave's End Swimwear", "Ordering process", "steps", ["#181818", "#ffffff", "#38bdf8", "#2dd4bf"]],
  ["chart-gamers", "World of Gamers", "Map and bars dashboard", "world", ["#151515", "#e0f2fe", "#22d3ee", "#0ea5e9"]],
  ["chart-inventory", "Simple Inventory", "Inventory table", "table", ["#f8fafc", "#111827", "#d1d5db", "#ffffff"]],
  ["chart-education", "Education Levels of Residents", "Education pie chart", "pie-report", ["#ffffff", "#111827", "#ec4899", "#14b8a6"]],
  ["chart-org-warm", "Organizational Chart", "Warm org structure", "org", ["#fffaf2", "#9a5a22", "#b76d2a", "#f5d0a5"]],
  ["chart-flavor", "What's your flavor?", "Survey horizontal bars", "horizontal", ["#ffffff", "#111827", "#38cfe0", "#0e5d91"]],
  ["chart-gdp", "Top 10 Countries by GDP in 2023", "Ranking arrow bars", "rank", ["#ffffff", "#111827", "#06b6d4", "#f59e0b"]],
  ["chart-pie-resource", "Read and Interpret Pie Charts", "Pie chart resource", "cover-pie", ["#f5ecd8", "#245b54", "#facc15", "#ef5c39"]],
  ["chart-decision", "Decision Input Constellation", "Decision diagram", "constellation", ["#ffffff", "#111827", "#f97316", "#0ea5e9"]],
  ["chart-funnel", "Sales Funnel", "Funnel infographic", "funnel", ["#ffffff", "#111827", "#38bdf8", "#2dd4bf"]],
  ["chart-marketing-strategy", "Marketing Strategy", "Column strategy plan", "strategy", ["#f5f0e6", "#0f4f5a", "#14b8a6", "#f97316"]],
  ["chart-reel-deal", "The Reel Deal", "Weekly activity bar chart", "bars-dark", ["#151515", "#ffffff", "#2dd4bf", "#0ea5e9"]],
  ["chart-media", "Media Muse Advertising", "Chevron process", "chevrons", ["#ffffff", "#111827", "#22d3ee", "#0e5d91"]],
  ["chart-project-pie", "Project Pie Chart", "Project pie report", "pie-report", ["#ffffff", "#0f4c81", "#0087b5", "#22d3ee"]],
  ["chart-process-pie", "Process Pie Chart", "Circular process pie", "process-pie", ["#fffde8", "#111827", "#facc15", "#22d3ee"]],
  ["chart-project-cost", "Project Cost", "Cost breakdown ring", "cost", ["#ffffff", "#111827", "#0e5d91", "#67e8f9"]],
  ["chart-financial-cycle", "Financial Planning Cycle", "Planning cycle", "cycle", ["#ffffff", "#111827", "#2dd4bf", "#0e5d91"]],
  ["chart-departments", "Borcelle Organization Chart Departments", "Department org chart", "org", ["#f5f5f5", "#64748b", "#f59e0b", "#94a3b8"]],
  ["chart-infographic", "Infographic and Chart", "Blue infographic cover", "photo-cover", ["#1e66a8", "#ffffff", "#0e5d91", "#60a5fa"]],
].map(([id, name, sub, chartStyle, palette]) => ({ id, category: "charts", name, sub, size: "Graph", layout: "chart", chartStyle, preview: `chart-card ${chartStyle}`, photo: showcasePhotos.business, palette }));

const showcaseYoutubeTemplates = [
  ["youtube-cinematic-street", "Cinematic Street", "Rainy cinematic vlog", "cinematic", "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", ["#101010", "#ffffff", "#f8fafc", "#64748b"]],
  ["youtube-podcast-economy", "Podcast", "Global economy podcast", "podcast", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80", ["#ffffff", "#0b4cc2", "#1d4ed8", "#facc15"]],
  ["youtube-urban-legends", "The Scariest Urban Legends", "Dark mystery story", "horror", "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80", ["#06110d", "#ffffff", "#ef2222", "#111827"]],
  ["youtube-investing", "Investing Tips To Grow Your Wealth", "Finance thumbnail", "finance", "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1200&q=80", ["#dc0000", "#111827", "#ffffff", "#facc15"]],
  ["youtube-breaking-news", "Breaking News", "World affairs update", "news", "https://images.unsplash.com/photo-1562788869-4ed32648eb72?auto=format&fit=crop&w=1200&q=80", ["#111111", "#ffffff", "#ef1d1d", "#f8fafc"]],
  ["youtube-neural-network", "What Is A Neural Network?", "AI explainer", "ai-blue", "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=1200&q=80", ["#071a46", "#ffffff", "#2563eb", "#8b5cf6"]],
  ["youtube-creative-design", "Creative Thumbnail Design", "Creator tutorial", "creator", "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=1200&q=80", ["#072b0a", "#ffffff", "#facc15", "#22c55e"]],
  ["youtube-india-parks", "India", "National parks travel", "travel", "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80", ["#0f172a", "#ffffff", "#f8fafc", "#94a3b8"]],
  ["youtube-rescue-news", "Breaking News", "Heartbreaking rescue", "red-news", "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80", ["#aa0f0f", "#ffffff", "#ef4444", "#111827"]],
  ["youtube-late-night", "Late Night Conversation", "Podcast episode", "night", "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80", ["#08140d", "#ffffff", "#4ade80", "#111827"]],
  ["youtube-work-home", "How Do I Set Up My Work At Home?", "Remote work episode", "interview", "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=1200&q=80", ["#111111", "#ffffff", "#f59e0b", "#94a3b8"]],
  ["youtube-film", "Film", "Stories behind the screen", "film", "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80", ["#180f0c", "#ffffff", "#d81e05", "#f8fafc"]],
  ["youtube-janmashtami", "Happy Janmashtami", "Festival vlog", "festival", "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80", ["#a30f2d", "#fff7ed", "#facc15", "#f97316"]],
  ["youtube-nature-talk", "Let's Talk Nature", "Nature podcast", "nature-talk", "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80", ["#18302d", "#ffffff", "#f97316", "#22d3ee"]],
  ["youtube-ai-methods", "AI Methods", "AI tutorial", "ai-green", "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80", ["#071d19", "#ffffff", "#7dd3fc", "#2dd4bf"]],
  ["youtube-cinematic-vlog", "Cinematic Vlog", "Road trip vlog", "cinematic-vlog", "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80", ["#17212b", "#ffffff", "#f8fafc", "#94a3b8"]],
  ["youtube-thing-works", "This Thing Actually Works", "Creator proof thumbnail", "proof", "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=1200&q=80", ["#ffffff", "#111827", "#111111", "#22c55e"]],
  ["youtube-adventure", "Adventure", "Mountain travel vlog", "adventure", "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80", ["#20323d", "#ffffff", "#f8fafc", "#94a3b8"]],
  ["youtube-game-night", "Game Night!", "Gaming thumbnail", "gaming", "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80", ["#0040a8", "#ffffff", "#f97316", "#38bdf8"]],
  ["youtube-jungle", "Journey To The Heart", "Jungle travel", "jungle", "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80", ["#11201b", "#fff7a3", "#d9f99d", "#ffffff"]],
  ["youtube-cinematic-night", "Cinematic Vlog", "Moody night vlog", "moody", "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80", ["#15130b", "#f9e77f", "#facc15", "#ffffff"]],
  ["youtube-deepmind", "Deepmind Uncovered", "Tech mystery", "bold-cutout", "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=1200&q=80", ["#f6f1e8", "#111111", "#ff0050", "#facc15"]],
  ["youtube-gujarati", "Explore The Colors Of Gujarati Clothing!", "Fashion culture", "fashion", "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80", ["#111111", "#ffffff", "#f59e0b", "#ef4444"]],
  ["youtube-skincare", "Minimal Skincare Routine", "Beauty routine", "skincare", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80", ["#8b735f", "#ffffff", "#facc15", "#f8fafc"]],
  ["youtube-money", "Money Making Ideas", "Finance ideas", "money", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=80", ["#050505", "#ffffff", "#ec1555", "#facc15"]],
  ["youtube-new-gold", "What Is The New Gold?", "Economic podcast", "podcast-red", "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80", ["#2a0f0f", "#ffffff", "#ef4444", "#f8fafc"]],
  ["youtube-exposed", "The Real Truth Exposed!", "Truth reveal", "exposed", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80", ["#450a0a", "#ffffff", "#facc15", "#ef4444"]],
  ["youtube-kolkata", "Kolkata Chronicles", "City travel", "city", "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80", ["#facc15", "#111827", "#ffffff", "#0f172a"]],
  ["youtube-prompt-guide", "AI Prompt Guide", "AI start here", "sci-fi", "https://images.unsplash.com/photo-1516192518150-0d8fee5425e3?auto=format&fit=crop&w=1200&q=80", ["#231f37", "#ffffff", "#fda4af", "#ef4444"]],
].map(([id, name, sub, youtubeStyle, photo, palette]) => ({ id, category: "youtube", name, sub, size: "Thumbnail", layout: "youtube", youtubeStyle, youtubeFeatured: true, photo, palette }));

const generatedTemplates = categories.flatMap((category, categoryIndex) =>
  Array.from({ length: 18 }, (_, index) => {
    const palette = brandPalettes[(categoryIndex + index) % brandPalettes.length];
    const style = templateStyles[index % templateStyles.length];
    return {
      id: `${category.id}-${index + 1}`,
      category: category.id,
      name: category.subjects[index % category.subjects.length],
      sub: `${style.name} ${category.name}`,
      size: category.size,
      layout: style.layout,
      photo: photos[(index + categoryIndex) % photos.length],
      palette,
    };
  })
);

const templates = [...showcasePresentationTemplates, ...showcasePosterTemplates, ...showcaseSocialTemplates, ...showcaseStoryTemplates, ...showcaseBusinessTemplates, ...showcaseYoutubeTemplates, ...showcaseChartTemplates, ...showcaseInvitationTemplates, ...generatedTemplates];

const CANVAS = { w: 960, h: 540 };
const app = document.querySelector("#app");
const animationOptions = [
  { id: "simple", name: "Simple", group: "Featured" },
  { id: "sleek", name: "Sleek", group: "Featured" },
  { id: "fun", name: "Fun", group: "Featured" },
  { id: "party", name: "Party", group: "Featured" },
  { id: "corporate", name: "Corporate", group: "Featured" },
  { id: "chill", name: "Chill", group: "Featured" },
  { id: "rise", name: "Rise", group: "General" },
  { id: "pan", name: "Pan", group: "General" },
  { id: "fade", name: "Fade", group: "General" },
  { id: "pop", name: "Pop", group: "General" },
  { id: "wipe", name: "Wipe", group: "General" },
  { id: "breathe", name: "Breathe", group: "General" },
  { id: "baseline", name: "Baseline", group: "General" },
  { id: "drift", name: "Drift", group: "General" },
  { id: "tectonic", name: "Tectonic", group: "General" },
  { id: "tumble", name: "Tumble", group: "General" },
  { id: "neon", name: "Neon", group: "General" },
  { id: "scrapbook", name: "Scrapbook", group: "General" },
  { id: "stomp", name: "Stomp", group: "General" },
  { id: "block", name: "Block", group: "General" },
];
const transitionOptions = ["None", "Morph", "Fade", "Push", "Wipe", "Split", "Reveal", "Cut", "Random Bars", "Shape", "Uncover", "Cover", "Flash"];
const iconAssets = makeIconAssets();
const shapeAssets = makeShapeAssets();
const modelProviders = {
  z_ai: { label: "Z.ai", baseUrl: "https://open.bigmodel.cn/api/paas/v4", protocol: "OpenAI" },
  deepseek: { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", protocol: "OpenAI" },
  minimax: { label: "MiniMax", baseUrl: "https://api.minimax.chat/v1", protocol: "OpenAI" },
  kimi: { label: "Kimi (Moonshot)", baseUrl: "https://api.moonshot.cn/v1", protocol: "OpenAI" },
  custom: { label: "Custom", baseUrl: "", protocol: "OpenAI" },
};
const modelProviderOrder = ["z_ai", "deepseek", "minimax", "kimi", "custom"];

let state = {
  tool: "templates",
  activeCategory: "presentation",
  query: "",
  pageIndex: 0,
  selectedId: null,
  selectedIds: [],
  focusTextId: null,
  lastTextClick: null,
  textBoxMode: false,
  internalClipboard: [],
  showDownloadMenu: false,
  showShareMore: false,
  shareView: "main",
  shareMessage: "",
  zoom: 0.62,
  projectName: "Untitled design",
  pages: [makeBlankPage("Welcome")],
  projects: loadProjects(),
  history: [],
  future: [],
  panelScrollTop: 0,
  panelScrollTool: "",
  modelConfigs: loadModelConfigs(),
  activeModelId: localStorage.getItem("studio-active-model-id") || "",
  showModelModal: false,
  modelEditingId: "",
  modelDraft: null,
  modelStatus: "",
  aiGenerating: false,
  aiStatus: "",
  aiTemplateFamily: "auto",
  aiPaletteHint: "auto",
  aiAutoPhotos: true,
  photoSearch: null,
  photoSearchPending: false,
  collabEnabled: false,
  collabWorkspace: "studio-" + Date.now().toString(36),
  collabUserName: "User" + Math.random().toString(36).slice(2, 6),
  collabClient: null,
  collabPeers: [],
  presenterWindow: null,
  templates: loadTemplates(),
  activeTemplateId: null,
  marketplaceCategory: null,
  marketplaceSort: "newest",
  brandKit: loadBrandKit(),
};

applyTemplate("presentation-1", false, false);

function render() {
  app.innerHTML = `
    <main class="studio">
      <header class="topbar">
        <div class="brand"><span class="brand-mark">C</span><span>Codestream</span></div>
        <div class="design-name">
          <span class="menu-icon">${icons.menu}</span>
          <input value="${escapeAttr(state.projectName)}" data-project-name aria-label="Design name">
        </div>
        <div class="top-actions">
          <button class="btn ghost" data-action="preview">Preview</button>
          <button class="btn" data-action="beautify">${icons.spark} Magic layout</button>
          <div class="download-wrap">
            <button class="btn primary" data-action="download">${icons.download} Download</button>
            ${state.showDownloadMenu ? renderSharePanel() : ""}
          </div>
        </div>
      </header>
      <section class="workspace">
        ${renderRail()}
        <aside class="panel">${renderPanel()}</aside>
        ${renderMainArea()}
      </section>
    </main>
    ${state.showModelModal ? renderModelModal() : ""}
  `;
  bindEvents();
  restorePanelScroll();
}

function renderMainArea() {
  if (state.tool === "templates") return renderTemplateBrowser();
  if (state.tool === "projects") return renderProjectsBrowser();
  return renderEditor();
}

function renderRail() {
  const items = [
    ["templates", "Templates", icons.layout],
    ["ppt", "PPT Build", icons.layers],
    ["ai-ppt", "AI PPT", icons.spark],
    ["models", "Model API", icons.link],
    ["text", "Text", icons.text],
    ["photos", "Photos", icons.image],
    ["videos", "Videos", icons.video],
    ["icons", "Icons", icons.icon],
    ["shapes", "Elements", icons.shapes],
    ["brand", "Brand", icons.palette],
    ["animate", "Animate", icons.spark],
    ["layers", "Layers", icons.layers],
    ["upload", "Upload", icons.upload],
    ["projects", "Projects", icons.folder],
  ];
  return `<nav class="rail">${items
    .map(([id, label, icon]) => `<button class="rail-btn ${state.tool === id ? "active" : ""}" data-tool="${id}" title="${label}">${icon}<span>${label}</span></button>`)
    .join("")}</nav>`;
}

function renderPanel() {
  if (state.tool === "templates") return renderTemplatePanel();
  if (state.tool === "ppt") return renderPptPanel();
  if (state.tool === "ai-ppt") return renderAiPptPanel();
  if (state.tool === "models") return renderModelPanel();
  if (state.tool === "projects") return renderProjectsPanel();
  if (state.tool === "text") return renderTextPanel();
  if (state.tool === "photos") return renderPhotoPanel();
  if (state.tool === "videos") return renderVideoPanel();
  if (state.tool === "icons") return renderIconPanel();
  if (state.tool === "shapes") return renderShapesPanel();
  if (state.tool === "brand") return renderBrandPanel();
  if (state.tool === "animate") return renderAnimatePanel();
  if (state.tool === "layers") return renderLayersPanel();
  if (state.tool === "upload") return renderUploadPanel();
  return "";
}

function renderSearch(placeholder = "Search") {
  return `<div class="search">${icons.search}<input placeholder="${placeholder}" value="${escapeAttr(state.query)}" data-search></div>`;
}

function renderSharePanel() {
  if (state.shareView === "powerpoint") return renderPowerPointSharePanel();
  return `<div class="share-panel">
    <div class="share-head">
      <strong>Share design</strong>
      <span class="visitor-count">${icons.layout} 0 visitors</span>
      <button class="icon-btn" title="Share settings" data-share-action="settings">${icons.palette}</button>
    </div>
    <label class="share-people"><span>People with access</span><input data-share-person placeholder="Add people"></label>
    <div class="share-avatar-row"><span class="share-avatar">C</span><button data-share-action="add-person">+</button></div>
    <label class="access-level"><span>Access level</span><select data-share-access>
      <option>Only you can access</option>
      <option>Anyone with the link can view</option>
      <option>Anyone with the link can edit</option>
    </select></label>
    <button class="copy-link-btn" data-share-action="copy-link">${icons.link || "link"} Copy link</button>
    <button class="custom-link-btn" data-share-action="custom-link">Create custom link</button>
    ${state.shareMessage ? `<p class="share-message">${escapeHtml(state.shareMessage)}</p>` : ""}
    <div class="share-grid">
      ${renderShareTile("download", "Download", icons.download)}
      ${renderShareTile("present", "Present", icons.spark)}
      ${renderShareTile("public-link", "Public view link", "link")}
      ${renderShareTile("whatsapp", "WhatsApp", "WA")}
      ${renderShareTile("instagram", "Instagram", "IG")}
      ${renderShareTile("powerpoint", "Microsoft PowerPoint", "P")}
      ${renderShareTile("embed", "Embed", "</>")}
      ${renderShareTile("see-all", "See all", "...")}
    </div>
    ${state.showShareMore ? `<div class="share-more">
      <button data-export="png">PNG image</button>
      <button data-export="pngs">PNG images (ZIP)</button>
      <button data-export="svg">SVG file</button>
      <button data-export="html">HTML file</button>
      <button data-export="mp4">MP4 video</button>
      <button data-export="ppt">PPT file</button>
      <button data-export="pdf">PDF file</button>
      <button data-export="json">Project JSON</button>
    </div>` : ""}
  </div>`;
}

function renderPowerPointSharePanel() {
  const pageLabel = state.pages.length === 1 ? "Page 1" : `Pages 1-${state.pages.length}`;
  return `<div class="share-panel ppt-share-panel">
    <div class="ppt-share-head">
      <button class="icon-btn" title="Back" data-share-action="back-main">${icons.down}</button>
      <strong>Microsoft PowerPoint</strong>
    </div>
    <p>Download your design as a Microsoft PowerPoint document</p>
    <label class="ppt-share-field"><span>Select pages</span><select data-ppt-pages>
      <option>${pageLabel}</option>
      <option>Current page</option>
      <option>All pages</option>
    </select></label>
    <label class="ppt-save-setting"><input type="checkbox" data-ppt-save-settings> Save download settings</label>
    <button class="ppt-download-btn" data-share-action="download-powerpoint">Download</button>
  </div>`;
}

function renderShareTile(action, label, icon) {
  return `<button class="share-tile ${action}" data-share-action="${action}">
    <span>${typeof icon === "string" ? icon : icon}</span>
    <small>${label}</small>
  </button>`;
}

function getFilteredTemplates() {
  return templates.filter((item) => {
    const matchesCategory = item.category === state.activeCategory;
    const haystack = `${item.name} ${item.sub} ${item.size}`.toLowerCase();
    return matchesCategory && haystack.includes(state.query.toLowerCase());
  });
}

function renderTemplatePanel() {
  const activeCategory = categories.find((category) => category.id === state.activeCategory) || categories[0];
  return `${renderSearch("Search templates")}
    <div class="panel-body">
      <div class="panel-heading">
        <div><strong>Templates</strong><span>Choose a format, then pick a design</span></div>
      </div>
      <div class="category-list">
        ${categories.map((category) => `<button class="category-row ${category.id === state.activeCategory ? "active" : ""}" data-category="${category.id}">
          <span>${category.name}</span><small>${category.size}</small>
        </button>`).join("")}
      </div>
      <div class="panel-heading compact">
        <div><strong>${activeCategory.name}</strong><span>${getFilteredTemplates().length} prebuilt templates</span></div>
      </div>
      <p class="template-note">Click any thumbnail in the main gallery to load it on your current page.</p>
    </div>`;
}

function renderPptPanel() {
  return `${renderSearch("Search presentation tools")}
    <div class="panel-body">
      <div class="panel-heading">
        <div><strong>Presentation Build</strong><span>Create slides, save projects, export PPT</span></div>
      </div>
      <div class="ppt-action-stack">
        <button class="wide-action primary-action" data-action="new-deck">${icons.plus} New presentation</button>
        <button class="wide-action" data-action="add-title-slide">${icons.text} Title slide</button>
        <button class="wide-action" data-action="add-agenda-slide">${icons.layout} Agenda slide</button>
        <button class="wide-action" data-action="add-content-slide">${icons.layers} Content slide</button>
        <button class="wide-action" data-action="add-chart-slide">${icons.shapes} Chart slide</button>
        <button class="wide-action" data-action="save-project">${icons.folder} Save to projects</button>
    <button class="wide-action" data-action="export-ppt">${icons.download} Export PPT</button>
    <div class="ai-export-row">
      <button class="wide-action" data-action="export-pdf">${icons.download} Export PDF</button>
      <button class="wide-action" data-action="export-html">${icons.download} Export HTML</button>
      <button class="wide-action" data-action="export-pngs">${icons.download} PNG images (ZIP)</button>
      <button class="wide-action" data-action="export-mp4">${icons.download} Export MP4</button>
    </div>
      </div>
      <div class="ppt-status-card">
        <strong>${escapeHtml(state.projectName)}</strong>
        <span>${state.pages.length} slides · slide ${state.pageIndex + 1}</span>
      </div>
      <div class="panel-heading compact">
        <div><strong>Current deck</strong><span>Click a slide below to edit</span></div>
      </div>
      <div class="ppt-slide-list">
        ${state.pages.map((page, index) => `<button class="ppt-slide-row ${index === state.pageIndex ? "active" : ""}" data-page="${index}">
          ${renderSlidePreview(page, index, 0.07, "ppt-row-preview")}
          <span class="ppt-slide-copy">
            <strong>${escapeHtml(page.name)}</strong>
            <small>Slide ${index + 1}</small>
          </span>
        </button>`).join("")}
      </div>
    </div>`;
}

function renderAiPptPanel() {
  const activeModel = getActiveModel();
  const modelLabel = activeModel ? `${activeModel.displayName || activeModel.modelId} · ${providerLabel(activeModel.provider)}` : "Local fallback generator";
  return `<div class="panel-body">
    <div class="panel-heading">
      <div><strong>AI PPT Generator</strong><span>Prompt se complete slide deck banaye</span></div>
    </div>
    <div class="ai-model-card">
      <span><strong>${escapeHtml(modelLabel)}</strong><small>${activeModel ? "Active model se content, structure, aur template direction generate hoga." : "Model API section me model activate karoge to wahi generator use hoga."}</small></span>
      <button class="mini-action" data-tool="models">Model API</button>
    </div>
    <label class="ai-field">
      <span>Topic</span>
      <textarea data-ai-topic placeholder="Example: Passive income mobile app pitch deck">${escapeHtml(state.aiTopic || "")}</textarea>
    </label>
    <div class="ai-grid">
      <label><span>Slides</span><input data-ai-slides type="number" min="3" max="12" value="${state.aiSlides || 8}"></label>
      <label><span>Tone</span><select data-ai-tone>
        ${["Startup pitch", "Business report", "Education", "Marketing", "Minimal"].map((tone) => `<option ${tone === (state.aiTone || "Startup pitch") ? "selected" : ""}>${tone}</option>`).join("")}
      </select></label>
      <label><span>Template family</span><select data-ai-template-family>
        ${[["auto","Auto (AI decides)"],["dark-tech","Dark Tech"],["clean-business","Clean Business"],["editorial-split","Editorial Split"],["agriculture-photo","Agriculture Photo"],["showcase","Showcase"]].map(([v,label]) => `<option ${v === (state.aiTemplateFamily || "auto") ? "selected" : ""} value="${v}">${label}</option>`).join("")}
      </select></label>
      <label><span>Palette</span><select data-ai-palette>
        ${[["auto","Auto"],["blue","Blue"],["green","Green"],["orange","Orange"],["purple","Purple"],["dark","Dark"],["teal","Teal"],["red","Red"],["neutral","Neutral"]].map(([v,label]) => `<option ${v === (state.aiPaletteHint || "auto") ? "selected" : ""} value="${v}">${label}</option>`).join("")}
      </select></label>
    </div>
    <label class="ai-field ai-photos-toggle"><input type="checkbox" data-ai-autophotos ${state.aiAutoPhotos === false ? "" : "checked"}> <span>Auto-match topic photos</span><small>Generated decks me visual keywords se live stock photos search karke lagata hai</small></label>
    <button class="wide-action primary-action" data-action="generate-ai-ppt" ${state.aiGenerating ? "disabled" : ""}>${icons.spark} ${state.aiGenerating ? (state.aiStatus?.includes("Step 1") ? "Step 1/3: Planning..." : state.aiStatus?.includes("Step 2") ? "Step 2/3: Outlining..." : state.aiStatus?.includes("Step 3") ? "Step 3/3: Writing..." : "Building...") : "Generate PPT"}</button>
    <button class="wide-action" data-action="save-project">${icons.folder} Save generated deck</button>
    <button class="wide-action" data-action="export-ppt">${icons.download} Export PPT</button>
    ${state.aiStatus ? `<div class="model-status ${state.aiStatus.startsWith("Error") ? "error" : ""}">${escapeHtml(state.aiStatus)}</div>` : ""}
    <div class="ai-note">
      <strong>Output</strong>
      <span>3-step pipeline: strategy (style/arc/palette) → deck outline → slide-by-slide writing. Outline aate hi deck editor me live ban jata hai — har slide ka content likhte hi preview update hota hai.</span>
    </div>
  </div>`;
}

function renderModelPanel() {
  const activeModel = getActiveModel();
  return `<div class="panel-body">
    <div class="panel-heading">
      <div><strong>Model and API</strong><span>AI PPT generation ke liye external models manage karein</span></div>
    </div>
    <button class="wide-action primary-action" data-model-action="new">${icons.plus} Add Custom Model</button>
    <div class="model-list">
      ${state.modelConfigs.map((model) => renderModelRow(model)).join("") || `<div class="empty-state model-empty">No models added. Add a model, test connection, then activate it.</div>`}
    </div>
    <div class="ai-note">
      <strong>Current selection</strong>
      <span>${activeModel ? `${escapeHtml(activeModel.displayName || activeModel.modelId)} active hai. AI PPT Generator isi model se complete deck plan banayega.` : "Koi model active nahi hai. Generator local fallback se deck banayega."}</span>
    </div>
    ${state.modelStatus ? `<div class="model-status ${state.modelStatus.startsWith("Error") ? "error" : ""}">${escapeHtml(state.modelStatus)}</div>` : ""}
  </div>`;
}

function renderModelRow(model) {
  const active = model.id === state.activeModelId;
  const tested = model.lastTest === "ok";
  return `<div class="model-row ${active ? "active" : ""}">
    <span>
      <strong>${escapeHtml(model.displayName || model.modelId || "Untitled model")}</strong>
      <small>${escapeHtml(providerLabel(model.provider))} · ${escapeHtml(model.modelId || "No model id")}</small>
      <em class="${tested ? "connected" : ""}">${tested ? "Connected" : "Not tested"}</em>
    </span>
    <div class="model-row-actions">
      <button class="mini-action ${active ? "active" : ""}" data-model-action="toggle-active" data-model-id="${model.id}">${active ? "Deactivate" : "Activate"}</button>
      <button class="mini-action" data-model-action="test" data-model-id="${model.id}">Test</button>
      <button class="mini-action" data-model-action="edit" data-model-id="${model.id}">Edit</button>
      <button class="mini-action danger" data-model-action="delete" data-model-id="${model.id}">Delete</button>
    </div>
  </div>`;
}

function renderModelModal() {
  const draft = state.modelDraft || makeModelDraft();
  const provider = modelProviders[draft.provider] || modelProviders.custom;
  return `<div class="modal-backdrop">
    <div class="model-modal">
      <div class="modal-head">
        <strong>${state.modelEditingId ? "Edit Model" : "Add Model"}</strong>
        <button class="icon-btn" title="Close" data-model-action="close">&times;</button>
      </div>
      <div class="risk-note"><b>!</b><span>External model add karne par aap apni API key aur endpoint apne risk par use kar rahe hain.</span></div>
      <label class="model-field wide"><span>* Provider</span><select data-model-field="provider">
        ${modelProviderOrder.map((id) => `<option value="${id}" ${id === draft.provider ? "selected" : ""}>${escapeHtml(modelProviders[id].label)}</option>`).join("")}
      </select></label>
      <div class="model-form-grid">
        <label class="model-field"><span>* Model ID</span><input data-model-field="modelId" value="${escapeAttr(draft.modelId || "")}" placeholder="glm-4.5, deepseek-chat, moonshot-v1-8k"></label>
        <label class="model-field"><span>Display Name</span><input data-model-field="displayName" value="${escapeAttr(draft.displayName || "")}" placeholder="Moonshot"></label>
        <label class="model-field"><span>API Key</span><input data-model-field="apiKey" type="password" value="${escapeAttr(draft.apiKey || "")}" placeholder="Enter API key"></label>
        <label class="model-field"><span>API Protocol</span><select data-model-field="protocol">
          <option ${draft.protocol === "OpenAI" ? "selected" : ""}>OpenAI</option>
        </select></label>
      </div>
      <label class="model-field wide"><span>Base URL</span><input data-model-field="baseUrl" value="${escapeAttr(draft.baseUrl ?? provider.baseUrl)}" placeholder="${escapeAttr(provider.baseUrl || "https://api.example.com/v1")}"></label>
      <div class="model-test-row">
        <span class="test-state ${draft.lastTest === "ok" ? "connected" : draft.lastTest === "error" ? "error" : ""}">
          <b></b><strong>${draft.lastTest === "ok" ? "Connected" : draft.lastTest === "error" ? "Connection failed" : "Not tested yet"}</strong>
          <small>Current config se real request bhejkar endpoint verify karta hai.</small>
        </span>
        <button class="mini-action" data-model-action="test-draft">Connectivity Test</button>
      </div>
      <div class="modal-actions">
        <button class="mini-action" data-model-action="close">Cancel</button>
        <button class="mini-action primary" data-model-action="save">${state.modelEditingId ? "Save" : "Add"}</button>
      </div>
    </div>
  </div>`;
}

function renderProjectsPanel() {
  return `${renderSearch("Search projects")}
    <div class="panel-body">
      <div class="panel-heading">
        <div><strong>Projects</strong><span>${state.projects.length} saved designs</span></div>
      </div>
      <button class="wide-action primary-action" data-action="save-project">${icons.plus} Save current work</button>
      <button class="wide-action" data-action="new-deck">${icons.layout} Start new presentation</button>
      <p class="template-note">Saved presentations and designs appear in the main Projects gallery.</p>
    </div>`;
}

function renderTemplateMarketplace() {
  const userTemplates = state.templates.filter(t => t.userCreated);
  const allTemplates = state.templates;
  return `${renderSearch("Search templates (name, tags)")}
    <div class="panel-body">
      <div class="panel-heading">
        <div><strong>Template Marketplace</strong><span>${allTemplates.length} templates (${userTemplates.length} yours)</span></div>
      </div>
      <div class="ai-grid">
        <label><span>Category</span><select data-marketplace-category>
          <option value="all" ${!state.marketplaceCategory ? "selected" : ""}>All</option>
          <option value="presentation" ${state.marketplaceCategory === "presentation" ? "selected" : ""}>Presentation</option>
          <option value="social" ${state.marketplaceCategory === "social" ? "selected" : ""}>Social</option>
          <option value="poster" ${state.marketplaceCategory === "poster" ? "selected" : ""}>Poster</option>
          <option value="business" ${state.marketplaceCategory === "business" ? "selected" : ""}>Business</option>
          <option value="education" ${state.marketplaceCategory === "education" ? "selected" : ""}>Education</option>
          <option value="personal" ${state.marketplaceCategory === "personal" ? "selected" : ""}>Personal</option>
        </select></label>
        <label><span>Sort</span><select data-marketplace-sort>
          <option value="newest" ${state.marketplaceSort === "newest" ? "selected" : ""}>Newest</option>
          <option value="popular" ${state.marketplaceSort === "popular" ? "selected" : ""}>Most Used</option>
          <option value="name" ${state.marketplaceSort === "name" ? "selected" : ""}>Name</option>
        </select></label>
      </div>
      <button class="wide-action primary-action" data-action="save-as-template">${icons.folder} Save current deck as template</button>
      <div class="template-gallery marketplace-gallery">
        ${renderMarketplaceGallery()}
      </div>
    </div>`;
}

function renderMarketplaceGallery() {
  const filtered = getFilteredMarketplaceTemplates();
  if (!filtered.length) return `<div class="empty-state"><strong>No templates found</strong><span>Save your first deck as a template to get started!</span></div>`;
  return filtered.map(renderMarketplaceTemplateCard).join("");
}

function getFilteredMarketplaceTemplates() {
  let list = [...state.templates];
  const q = (state.query || "").toLowerCase();
  if (q) list = list.filter(t => t.name.toLowerCase().includes(q) || (t.tags||[]).some(tag => tag.toLowerCase().includes(q)));
  if (state.marketplaceCategory && state.marketplaceCategory !== "all") list = list.filter(t => t.category === state.marketplaceCategory);
  list.sort((a, b) => {
    if (state.marketplaceSort === "popular") return (b.useCount || 0) - (a.useCount || 0);
    if (state.marketplaceSort === "name") return a.name.localeCompare(b.name);
    return new Date(b.createdAt) - new Date(a.createdAt); // newest
  });
  return list;
}

function renderMarketplaceTemplateCard(template) {
  const thumb = template.thumb || generateTemplateThumb(template.pages);
  const isUser = template.userCreated;
  return `<button class="marketplace-template-card ${isUser ? "user-created" : ""}" data-template-id="${template.id}">
    <span class="template-thumb" style="background-image:url('data:image/svg+xml;base64,${btoa(thumb)}')"></span>
    <div class="template-info">
      <strong>${escapeHtml(template.name)}</strong>
      <span class="template-meta">${escapeHtml(template.category)} · ${template.pages.length} slides ${isUser ? "· Yours" : ""}</span>
      <span class="template-tags">${(template.tags||[]).slice(0,3).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</span>
    </div>
    <div class="template-actions">
      <button class="mini-action" data-action="use-template" data-template-id="${template.id}" title="Use this template">${icons.layout} Use</button>
      ${isUser ? `<button class="mini-action danger" data-action="delete-template" data-template-id="${template.id}" title="Delete">${icons.trash}</button>` : ""}
    </div>
  </button>`;
}

function renderTemplateBrowser() {
  const activeCategory = categories.find((category) => category.id === state.activeCategory) || categories[0];
  const filtered = getFilteredTemplates();
  if (state.activeCategory === "social") return renderSocialTemplateBrowser(activeCategory, filtered);
  if (state.activeCategory === "story") return renderStoryTemplateBrowser(activeCategory, filtered);
  if (state.activeCategory === "business") return renderBusinessTemplateBrowser(activeCategory, filtered);
  if (state.activeCategory === "youtube") return renderYoutubeTemplateBrowser(activeCategory, filtered);
  if (state.activeCategory === "charts") return renderChartTemplateBrowser(activeCategory, filtered);
  if (state.activeCategory === "invitation") return renderInvitationTemplateBrowser(activeCategory, filtered);
  return `<section class="template-browser">
    <div class="template-browser-head">
      <div>
        <strong>${activeCategory.name} templates</strong>
        <span>${filtered.length} original prebuilt designs</span>
      </div>
      <div class="browser-actions">
        <button class="btn" data-action="add-page">${icons.plus} Blank page</button>
        <button class="btn primary" data-template="${filtered[0]?.id || "presentation-1"}">${icons.spark} Use first template</button>
      </div>
    </div>
    <div class="template-gallery ${state.activeCategory === "poster" ? "poster-gallery" : ""}">
      ${filtered.map(renderTemplateGalleryCard).join("")}
    </div>
  </section>`;
}

function renderProjectsBrowser() {
  const projects = state.projects.filter((project) => {
    const haystack = `${project.name} ${project.kind}`.toLowerCase();
    return haystack.includes(state.query.toLowerCase());
  });
  return `<section class="template-browser projects-browser">
    <div class="template-browser-head">
      <div>
        <strong>Projects</strong>
        <span>${projects.length} saved projects and presentations</span>
      </div>
      <div class="browser-actions">
        <button class="btn" data-action="new-deck">${icons.plus} New presentation</button>
        <button class="btn primary" data-action="save-project">${icons.folder} Save current</button>
      </div>
    </div>
    <div class="projects-grid">
      ${projects.map(renderProjectCard).join("") || `<div class="projects-empty">
        <strong>No saved projects yet</strong>
        <span>Create a deck in PPT Build or AI PPT Generator, then save it here.</span>
      </div>`}
    </div>
  </section>`;
}

function renderProjectCard(project) {
  const firstPage = project.pages[0] || makeBlankPage(project.name);
  return `<button class="project-card" data-project="${project.id}">
    <span class="project-thumb" style="${pageBackground(firstPage)}">
      ${firstPage.elements.slice(0, 5).map(renderProjectThumbElement).join("")}
    </span>
    <strong>${escapeHtml(project.name)}</strong>
    <small>${project.pages.length} slides · ${escapeHtml(project.kind)}</small>
  </button>`;
}

function renderProjectThumbElement(el) {
  const scale = 0.19;
  const base = `left:${el.x * scale}px;top:${el.y * scale}px;width:${el.w * scale}px;height:${el.h * scale}px;opacity:${el.opacity ?? 1};`;
  if (el.type === "text") return `<i class="thumb-text" style="${base}font-size:${Math.max(5, el.fontSize * scale)}px;font-weight:${el.fontWeight};color:${el.color};font-family:${el.fontFamily || "Inter"}">${escapeHtml(el.text)}</i>`;
  if (el.type === "image") return `<i class="thumb-image" style="${base}background-image:url('${el.src}')"></i>`;
  if (el.type === "video") return `<i class="thumb-image" style="${base}background-image:url('${el.poster || ""}')"></i>`;
  if (el.type === "icon") return `<i class="thumb-icon" style="${base}font-size:${Math.max(7, (el.fontSize || Math.min(el.w, el.h)) * scale)}px;color:${el.color || "#111827"}">${iconEntity(el.code)}</i>`;
  if (el.type === "shapeAsset") {
    const asset = getShapeAsset(el.shapeId) || shapeAssets[0];
    return `<i class="thumb-shape-asset ${asset.kind}" style="${base}${shapeAssetElementStyle(asset, el, scale)}">${shapeAssetElementInner(asset, el, scale)}</i>`;
  }
  return `<i class="thumb-shape" style="${base}background:${el.fill};border-radius:${el.type === "circle" || el.type === "badge" || el.type === "pill" ? "999px" : "0"}"></i>`;
}

function renderYoutubeTemplateBrowser(activeCategory, filtered) {
  const youtubeTemplates = filtered.filter((template) => template.youtubeFeatured);
  return `<section class="template-browser youtube-template-browser">
    <div class="template-browser-head">
      <div>
        <strong>${activeCategory.name} templates</strong>
        <span>${youtubeTemplates.length} cinematic thumbnails, podcasts, news, AI, finance, gaming, travel, and creator covers</span>
      </div>
      <div class="browser-actions">
        <button class="btn" data-action="add-page">${icons.plus} Blank thumbnail</button>
        <button class="btn primary" data-template="${youtubeTemplates[0]?.id || "youtube-cinematic-street"}">${icons.spark} Use first template</button>
      </div>
    </div>
    <div class="youtube-gallery">
      ${youtubeTemplates.map(renderYoutubeTemplateCard).join("")}
    </div>
  </section>`;
}

function renderYoutubeTemplateCard(template) {
  const page = makeYoutubePageFromTemplate(template);
  return `<button class="youtube-template-card" data-template="${template.id}">
    <span class="youtube-template-art">
      <span class="youtube-mini-slide" style="${pageBackground(page)}">
        ${page.elements.map((el) => renderSlidePreviewElement(el, 1)).join("")}
      </span>
    </span>
  </button>`;
}

function renderChartTemplateBrowser(activeCategory, filtered) {
  const charts = filtered.filter((template) => template.category === "charts");
  return `<section class="template-browser chart-template-browser">
    <div class="template-browser-head">
      <div>
        <strong>${activeCategory.name} templates</strong>
        <span>${charts.length} charts, graphs, dashboards, tables, funnels, and org charts</span>
      </div>
      <div class="browser-actions">
        <button class="btn" data-action="add-chart-slide">${icons.plus} Chart slide</button>
        <button class="btn primary" data-template="${charts[0]?.id || "chart-market-share"}">${icons.spark} Use first template</button>
      </div>
    </div>
    <div class="chart-gallery">
      ${charts.map(renderChartTemplateCard).join("")}
    </div>
  </section>`;
}

function renderChartTemplateCard(template) {
  const page = makeChartPageFromTemplate(template);
  return `<button class="chart-template-card chart-style-${template.chartStyle || "bar"}" data-template="${template.id}">
    <span class="chart-template-art realistic">
      <span class="chart-mini-slide" style="${pageBackground(page)}">
        ${page.elements.map((el) => renderSlidePreviewElement(el, 1)).join("")}
      </span>
    </span>
    <span class="chart-template-label"><strong>${escapeHtml(template.name)}</strong><small>${escapeHtml(template.sub)}</small></span>
  </button>`;
}

function renderChartCardArt(style = "bar") {
  if (["pie", "donut", "pie-report", "cover-pie", "process-pie", "cost", "cycle"].includes(style)) return `<i class="chart-pie"></i><b class="chart-legend"></b><em class="chart-copy"></em>`;
  if (["org"].includes(style)) return `<i class="org-node top"></i><i class="org-node left"></i><i class="org-node mid"></i><i class="org-node right"></i><b class="org-lines"></b>`;
  if (["table", "compare", "research"].includes(style)) return `<i class="table-grid"></i><b class="table-title"></b>`;
  if (["process", "steps", "process-line", "strategy", "chevrons"].includes(style)) return `<i class="step-dot one"></i><i class="step-dot two"></i><i class="step-dot three"></i><i class="step-dot four"></i><b class="step-line"></b>`;
  if (["funnel"].includes(style)) return `<i class="funnel-layer one"></i><i class="funnel-layer two"></i><i class="funnel-layer three"></i>`;
  if (["hex", "constellation", "world"].includes(style)) return `<i class="hex one"></i><i class="hex two"></i><i class="hex three"></i><b class="chart-copy"></b>`;
  return `<i class="bar one"></i><i class="bar two"></i><i class="bar three"></i><i class="bar four"></i><i class="bar five"></i><b class="chart-copy"></b>`;
}

function renderInvitationTemplateBrowser(activeCategory, filtered) {
  const invitationTemplates = filtered.filter((template) => template.invitationFeatured);
  return `<section class="template-browser invitation-template-browser">
    <div class="template-browser-head">
      <div>
        <strong>${activeCategory.name} templates</strong>
        <span>${invitationTemplates.length} invitation-ready designs</span>
      </div>
      <div class="browser-actions">
        <button class="btn" data-action="add-page">${icons.plus} Blank page</button>
        <button class="btn primary" data-template="${invitationTemplates[0]?.id || "invitation-showcase-1"}">${icons.spark} Use first template</button>
      </div>
    </div>
    <div class="template-gallery invitation-gallery">
      ${invitationTemplates.map(renderTemplateGalleryCard).join("")}
    </div>
  </section>`;
}

function renderBusinessTemplateBrowser(activeCategory, filtered) {
  const businessTemplates = filtered.filter((template) => template.businessFeatured);
  return `<section class="template-browser business-template-browser">
    <div class="template-browser-head">
      <div>
        <strong>${activeCategory.name} templates</strong>
        <span>${businessTemplates.length} business-ready designs</span>
      </div>
      <div class="browser-actions">
        <button class="btn" data-action="add-page">${icons.plus} Blank page</button>
        <button class="btn primary" data-template="${businessTemplates[0]?.id || "business-showcase-1"}">${icons.spark} Use first template</button>
      </div>
    </div>
    <div class="template-gallery business-gallery">
      ${businessTemplates.map(renderTemplateGalleryCard).join("")}
    </div>
  </section>`;
}

function renderStoryTemplateBrowser(activeCategory, filtered) {
  const storyTemplates = filtered.filter((template) => template.storyFeatured);
  return `<section class="template-browser story-template-browser">
    <div class="template-browser-head">
      <div>
        <strong>${activeCategory.name} templates</strong>
        <span>${storyTemplates.length} story-ready designs</span>
      </div>
      <div class="browser-actions">
        <button class="btn" data-action="add-page">${icons.plus} Blank page</button>
        <button class="btn primary" data-template="${storyTemplates[0]?.id || "story-showcase-1"}">${icons.spark} Use first template</button>
      </div>
    </div>
    <div class="template-gallery story-gallery">
      ${storyTemplates.map(renderTemplateGalleryCard).join("")}
    </div>
  </section>`;
}

function renderSocialTemplateBrowser(activeCategory, filtered) {
  const socialTemplates = filtered.filter((template) => template.socialSection);
  const reels = socialTemplates.filter((template) => template.socialSection === "reels");
  const more = socialTemplates.filter((template) => template.socialSection !== "reels");
  return `<section class="template-browser social-template-browser">
    <div class="template-browser-head">
      <div>
        <strong>${activeCategory.name} templates</strong>
        <span>${filtered.length} social-ready designs</span>
      </div>
      <div class="browser-actions">
        <button class="btn" data-action="add-page">${icons.plus} Blank page</button>
        <button class="btn primary" data-template="${filtered[0]?.id || "social-reel-1"}">${icons.spark} Use first template</button>
      </div>
    </div>
    <div class="social-section-title">
      <h2>Instagram Reels</h2>
      <button data-template="${reels[0]?.id || "social-reel-1"}">See all</button>
    </div>
    <div class="template-gallery social-reels">
      ${reels.map(renderTemplateGalleryCard).join("")}
      <button class="social-next" data-template="${reels[0]?.id || "social-reel-1"}" aria-label="See more Instagram Reels">&rsaquo;</button>
    </div>
    <div class="social-section-title more">
      <h2>More templates for you</h2>
    </div>
    <div class="template-gallery social-more">
      ${more.map(renderTemplateGalleryCard).join("")}
    </div>
    <button class="help-fab" type="button">?</button>
  </section>`;
}

function renderEditor() {
  return `<section class="editor">
    ${renderToolbar()}
    <div class="canvas-wrap">
      <div class="slide ${slideTransitionClass(getPage())}${state.textBoxMode ? " text-box-mode" : ""}" style="${pageBackground(getPage())};transform:scale(${state.zoom});transform-origin:center;--slide-duration:${Number(getPage().transition?.duration || 5)}s;" data-slide>
        ${getPage().elements.map(renderElement).join("")}
        <div class="remote-cursors" data-remote-cursors>${renderRemoteCursorNodes()}</div>
      </div>
    </div>
    ${renderBottom()}
  </section>`;
}

function renderTemplateGalleryCard(template) {
  const [ink, paper, accent, pop] = template.palette;
  return `<button class="library-card ${template.layout} ${template.preview || ""} ${template.socialSize || ""} ${template.storySize || ""} ${template.businessSize || ""} ${template.invitationSize || ""}" data-template="${template.id}" style="--ink:${ink};--paper:${paper};--accent:${accent};--pop:${pop};--photo:url('${template.photo}')">
    <span class="library-photo"></span>
    <span class="library-overlay"></span>
    <span class="library-actions"><i>*</i><b>•••</b></span>
    <span class="library-content">
      <strong>${galleryTitle(template)}</strong>
      <small>${template.sub}</small>
    </span>
    <span class="library-preview ${template.layout}"><i></i><b></b><em></em></span>
  </button>`;
}

function brandFonts(query = "", fallback = null) {
  const bk = state.brandKit || defaultBrandKit();
  if (bk.fontLockEnabled && bk.primaryFont && bk.secondaryFont) {
    const list = [...new Set([bk.primaryFont, bk.secondaryFont])];
    return query ? list.filter((font) => font.toLowerCase().includes(query.toLowerCase())) : list;
  }
  return fallback;
}

function renderTextPanel() {
  const combos = [
    ["heading", "Big headline", "Launch your idea"],
    ["subheading", "Section title", "Clear supporting message"],
    ["body", "Body copy", "Add details, timings, prices, or notes."],
    ["quote", "Quote", "Make it memorable"],
  ];
  const query = state.query.toLowerCase();
  const matchingTextStyles = textStylePresets.filter((preset) => {
    const haystack = `${preset.label} ${preset.text}`.toLowerCase();
    return haystack.includes(query);
  });
  const matchingFonts = powerpointFonts.filter((font) => font.toLowerCase().includes(query));
  const fontsForPanel = brandFonts(query, matchingFonts);
  return `${renderSearch("Search text, fonts, slides")}
    <div class="panel-body">
      <button class="wide-action primary-action ${state.textBoxMode ? "active" : ""}" data-action="text-box-mode">${icons.plus} Text Box</button>
      <div class="panel-heading compact"><div><strong>Built-in Slide</strong><span>PowerPoint-style layouts</span></div></div>
      <div class="builtin-slide-grid">
        ${builtinSlideLayouts.map((layout) => `<button class="builtin-slide-card" data-builtin-slide="${layout.id}">
          <span class="slide-layout-preview ${layout.preview}"><i></i><b></b><em></em><u></u></span>
          <small>${escapeHtml(layout.name)}</small>
        </button>`).join("")}
      </div>
      <div class="panel-heading compact"><div><strong>Font style</strong><span>${fontsForPanel.length} fonts</span></div></div>
      <div class="font-style-list">
        ${fontsForPanel.map((font) => `<button class="font-style-row" data-font-style="${escapeAttr(font)}" style="font-family:'${escapeAttr(font)}', Arial, sans-serif">${escapeHtml(font)}</button>`).join("")}
      </div>
      <div class="panel-heading"><div><strong>Text presets</strong><span>Editable font and color</span></div></div>
      ${combos.map(([kind, title, copy]) => `<button class="text-sample ${kind}" data-add-text="${kind}"><strong>${title}</strong><span>${copy}</span></button>`).join("")}
      <div class="panel-heading compact"><div><strong>Font combinations</strong><span>${matchingTextStyles.length} ready styles</span></div></div>
      <div class="text-style-grid">
        ${matchingTextStyles.map((preset) => `<button class="text-style-card ${preset.className}" data-add-text="${preset.id}">
          <span>${escapeHtml(preset.text).replace(/\n/g, "<br>")}</span>
          <i>♛</i>
        </button>`).join("")}
      </div>
    </div>`;
}

function renderPhotoPanel() {
  const query = (state.query || "").trim();
  const searching = state.photoSearchPending === true || (state.photoSearch && state.photoSearch.query === query && !state.photoSearch.error);
  return `${renderSearch("Search photos")}
    <div class="panel-body">
      <div class="panel-heading"><div><strong>Photos</strong><span>${query ? (searching ? `Results for "${escapeHtml(query)}"` : `From ${state.photoSearch?.source === "unsplash" ? "Unsplash" : "Picsum"} — click to add`) : "Stock gallery — click to add"}</span></div></div>
      ${query ? renderPhotoSearchResults(query) : ""}
      ${query && state.photoSearch?.photos?.length ? "" : `<div class="asset-grid">${photos.map((src, index) => `<button class="photo-card ${index % 5 === 1 ? "tall" : ""}" data-photo="${escapeAttr(src)}" style="background-image:url('${escapeAttr(src)}')"></button>`).join("")}</div>`}
    </div>`;
}

function renderPhotoSearchResults(query) {
  const result = state.photoSearch;
  if (state.photoSearchPending || !result || result.query !== query) {
    return `<div class="photo-search-note">Searching "${escapeHtml(query)}"…</div>`;
  }
  if (result.error) {
    return `<div class="photo-search-note error">${escapeHtml(result.error)} — showing stock photos below.</div>`;
  }
  const photos = result.photos || [];
  if (!photos.length) return `<div class="photo-search-note">No results for "${escapeHtml(query)}".</div>`;
  return `<div class="asset-grid photo-results">${photos.map((photo, index) => `<button class="photo-card ${index % 5 === 1 ? "tall" : ""}" data-photo="${escapeAttr(photo.url)}" title="${escapeAttr(photo.alt || "")}${photo.photographer ? " — " + escapeAttr(photo.photographer) : ""}" style="background-image:url('${escapeAttr(photo.thumb)}')"></button>`).join("")}</div>`;
}

function renderVideoPanel() {
  const query = state.query.toLowerCase();
  const videos = stockVideos.filter((video) => `${video.title} ${video.theme}`.toLowerCase().includes(query));
  return `${renderSearch("Search videos")}
    <div class="panel-body">
      <div class="panel-heading"><div><strong>Videos</strong><span>Stock motion clips for reels, stories, thumbnails, and presentations</span></div></div>
      <div class="video-grid">
        ${videos.map((video, index) => `<button class="video-card ${video.tall || index % 7 === 5 ? "tall" : ""}" data-video="${video.src}" data-poster="${video.poster}" style="background-image:url('${video.poster}')">
          <video muted loop playsinline preload="metadata" src="${video.src}" poster="${video.poster}"></video>
          <span class="video-duration">${video.duration}</span>
          <span class="video-meta"><strong>${escapeHtml(video.title)}</strong><small>${escapeHtml(video.theme)}</small></span>
        </button>`).join("")}
      </div>
    </div>`;
}

function renderIconPanel() {
  const query = state.query.toLowerCase();
  const matchingIcons = iconAssets.filter((icon) => `${icon.name} ${icon.group}`.toLowerCase().includes(query));
  return `${renderSearch("Search 200 icons")}
    <div class="panel-body">
      <div class="panel-heading"><div><strong>Icons</strong><span>${matchingIcons.length} white line icons for designs, posters, thumbnails, and slides</span></div></div>
      <div class="icon-grid">
        ${matchingIcons.map((icon) => `<button class="icon-card" data-icon="${icon.code}" data-icon-name="${escapeAttr(icon.name)}" title="${escapeAttr(icon.name)}">
          <span>${iconEntity(icon.code)}</span>
          <small>${escapeHtml(icon.name)}</small>
        </button>`).join("")}
      </div>
    </div>`;
}

function renderShapesPanel() {
  const query = state.query.toLowerCase();
  const matchingShapes = shapeAssets.filter((shapeItem) => `${shapeItem.name} ${shapeItem.group}`.toLowerCase().includes(query));
  const groups = ["Grids", "Lines", "Shapes"];
  return `${renderSearch("Search elements")}
    <div class="panel-body">
      <div class="panel-heading"><div><strong>Elements</strong><span>${matchingShapes.length} grids, lines, frames, blobs, and geometric shapes</span></div></div>
      ${groups.map((group) => {
        const items = matchingShapes.filter((shapeItem) => shapeItem.group === group);
        if (!items.length) return "";
        return `<div class="element-section-title">${group}</div>
          <div class="shape-grid">
            ${items.map((shapeItem) => `<button class="shape-card" data-shape="${shapeItem.id}" title="${escapeAttr(shapeItem.name)}">
              <span class="shape-asset-preview ${shapeItem.kind}" style="${shapeAssetPreviewStyle(shapeItem)}">${shapeAssetPreviewInner(shapeItem)}</span>
              <small>${escapeHtml(shapeItem.name)}</small>
            </button>`).join("")}
          </div>`;
      }).join("")}
    </div>`;
}

function renderBrandPanel() {
  const bk = state.brandKit || defaultBrandKit();
  const googleFonts = [
    "Inter", "Roboto", "Open Sans", "Montserrat", "Poppins", "Nunito",
    "Source Sans Pro", "Lato", "Raleway", "Merriweather", "Playfair Display",
    "Oswald", "DM Sans", "Plus Jakarta Sans", "Space Grotesk", "Geist"
  ];
  return `<div class="panel-body">
    <div class="panel-heading"><div><strong>Brand Kit</strong><span>Logo, fonts and locked colors for visual consistency</span></div></div>

    <details class="brand-section" open>
      <summary><strong>${icons.image} Logo</strong></summary>
      <div class="brand-row">
        <label class="file-upload">
          <input type="file" accept="image/*" data-brand-logo>
          <span class="upload-label">${bk.logo ? `${icons.check} Logo loaded` : `${icons.plus} Upload logo (PNG/SVG, max 200KB)`}</span>
        </label>
        ${bk.logo ? `<img class="logo-preview" src="${bk.logo}" alt="Logo preview" style="max-width:${bk.logoWidth}px;max-height:${bk.logoHeight}px">` : ""}
      </div>
      <div class="brand-row">
        <label><span>Width (px)</span><input type="number" min="40" max="300" value="${bk.logoWidth}" data-brand-logo-width></label>
        <label><span>Height (px)</span><input type="number" min="20" max="150" value="${bk.logoHeight}" data-brand-logo-height></label>
      </div>
      ${bk.logo ? `<button class="btn danger" data-brand-clear-logo>${icons.trash} Remove logo</button>` : ""}
    </details>

    <details class="brand-section" open>
      <summary><strong>${icons.text} Brand fonts</strong></summary>
      <div class="brand-row">
        <label><span>Primary font (headings)</span><select data-brand-primary-font>${googleFonts.map(f => `<option ${f === bk.primaryFont ? "selected" : ""}>${f}</option>`).join("")}</select></label>
        <label><span>Secondary font (body)</span><select data-brand-secondary-font>${googleFonts.map(f => `<option ${f === bk.secondaryFont ? "selected" : ""}>${f}</option>`).join("")}</select></label>
      </div>
      <label class="toggle-row">
        <input type="checkbox" ${bk.fontLockEnabled ? "checked" : ""} data-brand-font-lock>
        <span>Lock font pickers to brand fonts only</span>
      </label>
    </details>

    <details class="brand-section" open>
      <summary><strong>${icons.palette} Locked color palette</strong></summary>
      <div class="color-grid">
        ${Object.entries(bk.lockedColors).map(([key, val]) => `<label class="color-lock-row" title="${key}"><span class="color-key">${key}</span><input type="color" value="${val}" data-brand-color="${key}"><span class="color-hex">${val}</span></label>`).join("")}
      </div>
      <label class="toggle-row">
        <input type="checkbox" ${bk.colorLockEnabled ? "checked" : ""} data-brand-color-lock>
        <span>Lock color pickers to the brand palette (hide other colors)</span>
      </label>
      <div class="brand-row">
        <button class="btn" data-brand-reset-colors>${icons.rotate} Reset to default</button>
        <button class="btn" data-brand-export-colors>${icons.download} Export palette (.json)</button>
      </div>
    </details>

    <details class="brand-section">
      <summary><strong>${icons.check} Apply brand kit to current project</strong></summary>
      <p class="brand-note">Applies the locked fonts and colors to all slides in the project. Existing elements keep their colors, but new elements will use the brand palette.</p>
      <div class="brand-row">
        <button class="btn" data-brand-apply>${icons.spark} Apply to project</button>
        <button class="btn primary" data-brand-restyle>${icons.spark} Magic Restyle</button>
      </div>
      <p class="brand-note">Magic Restyle remaps every element color to the nearest locked palette color, applies brand fonts and places your logo on each slide.</p>
    </details>

    <div class="brand-actions">
      <button class="btn" data-brand-export>${icons.download} Export Brand Kit (.json)</button>
      <button class="btn" data-brand-import>${icons.upload} Import Brand Kit</button>
      <button class="btn danger" data-brand-reset>${icons.rotate} Reset to default</button>
    </div>
  </div>`;
}

function renderAnimatePanel() {
  const page = getPage();
  const animation = page.animation || { id: "simple", scope: "both" };
  const transition = page.transition || { name: "None", duration: 5, direction: "right" };
  return `<div class="panel-body animate-panel">
    <div class="panel-heading animate-title">
      <div><strong>Page Animations</strong><span>Animate current slide or full deck</span></div>
      <button class="icon-btn" title="Close animate panel" data-tool="text">&times;</button>
    </div>
    <div class="magic-card" data-animation-option="simple">
      <span class="magic-thumb"><i>Aa</i><b></b></span>
      <span><strong>Magic Animate <em>New</em></strong><small>Instantly animate all pages in a style of your choice.</small></span>
    </div>
    ${renderAnimationGroup("Featured", animation.id)}
    ${renderAnimationGroup("General", animation.id)}
    <div class="animate-section">
      <strong>Animate</strong>
      <div class="segmented">
        ${["both", "enter", "exit"].map((scope) => `<button class="${animation.scope === scope ? "active" : ""}" data-animation-scope="${scope}">${scope === "both" ? "Both" : scope === "enter" ? "On enter" : "On exit"}</button>`).join("")}
      </div>
    </div>
    <div class="animate-section">
      <strong>Transition</strong>
      <div class="transition-grid">
        ${transitionOptions.map((name) => `<button class="transition-card ${transition.name === name ? "active" : ""}" data-transition-option="${name}">
          <span class="transition-icon transition-${slug(name)}"></span>
          <small>${name}</small>
        </button>`).join("")}
      </div>
      <label class="duration-control"><span>Duration</span><input type="range" min="0.2" max="5" step="0.1" value="${transition.duration || 0.7}" data-transition-duration><b>${Number(transition.duration || 0.7).toFixed(1)}s</b></label>
      <label class="duration-control"><span>Direction</span><select data-transition-direction>
        ${["right", "left", "up", "down"].map((direction) => `<option value="${direction}" ${direction === (transition.direction || "right") ? "selected" : ""}>${titleCase(direction)}</option>`).join("")}
      </select></label>
    </div>
    <div class="animate-footer">
      <button class="wide-action" data-action="remove-animations">Remove all animations</button>
      <button class="wide-action primary-action" data-action="apply-animation-all">Apply to all pages</button>
    </div>
  </div>`;
}

function renderAnimationGroup(group, selectedId) {
  const options = animationOptions.filter((option) => option.group === group);
  return `<div class="animate-section">
    <strong>${group}</strong>
    <div class="animation-grid">
      ${options.map((option) => `<button class="animation-card ${selectedId === option.id ? "active" : ""}" data-animation-option="${option.id}">
        <span class="animation-preview anim-${option.id}"><i></i><b>ABC</b><em></em></span>
        <small>${option.name}</small>
      </button>`).join("")}
    </div>
  </div>`;
}

function renderLayersPanel() {
  const items = [...getPage().elements].reverse();
  return `<div class="panel-body">
    <div class="panel-heading"><div><strong>Layers</strong><span>${items.length} objects on this page</span></div></div>
    <div class="layer-list">
      ${items.map((el) => `<button class="layer-item ${el.id === state.selectedId ? "active" : ""}" data-layer="${el.id}">
        <span>${layerName(el)}</span><small>${Math.round(el.x)}, ${Math.round(el.y)}</small>
      </button>`).join("") || '<div class="empty-state">No layers yet</div>'}
    </div>
  </div>`;
}

function renderUploadPanel() {
  return `<div class="panel-body">
    <label class="upload-zone">${icons.upload}<strong>Upload image</strong><span>PNG, JPG, or SVG</span><input type="file" accept="image/*" data-upload></label>
  </div>`;
}

function renderToolbar() {
  const selected = getSelected();
  const transition = getPage().transition || { duration: 5 };
  return `<div class="toolbar">
    <div class="toolbar-group">
      <button class="icon-btn" title="Undo" data-action="undo">${icons.undo}</button>
      <button class="icon-btn" title="Redo" data-action="redo">${icons.redo}</button>
      <span class="divider"></span>
      <button class="btn" data-action="add-page">${icons.plus} Page</button>
      <button class="btn" data-action="duplicate-page">${icons.duplicate} Duplicate page</button>
      <span class="divider"></span>
      <button class="btn ${state.collabEnabled ? "active" : ""}" title="Collaborate in real-time" data-action="toggle-collab">${state.collabEnabled ? icons.check : icons.link} ${state.collabEnabled ? "Live" : "Collab"}</button>
      ${state.collabEnabled && state.collabPeers.length ? `<span class="collab-presence" title="${escapeAttr(state.collabPeers.map((peer) => peer.user).join(", "))}">${renderCollabChips()}</span>` : ""}
    </div>
    <div class="toolbar-group responsive-controls">
      <button class="btn toolbar-duration" data-tool="animate"><span class="clock-dot"></span>${Number(transition.duration || 5).toFixed(1)}s</button>
      <button class="btn ${state.tool === "animate" ? "active" : ""}" data-tool="animate">${icons.spark} Animate</button>
      ${getPage().aiRender ? `<span class="divider"></span>
        <button class="btn" title="Same content, different layout" data-action="remix-layout">${icons.layout} Remix</button>
        <button class="btn" title="Rewrite this slide with AI" data-action="regenerate-slide">${icons.spark} AI Rewrite</button>` : ""}
      ${selected ? renderSelectedControls(selected) : '<span class="control muted">Select an object to edit</span>'}
      <button class="icon-btn" title="Move forward" data-action="bring-front">${icons.up}</button>
      <button class="icon-btn" title="Move backward" data-action="send-back">${icons.down}</button>
      <button class="icon-btn" title="Duplicate" data-action="duplicate">${icons.duplicate}</button>
      <button class="icon-btn danger" title="Delete" data-action="delete">${icons.trash}</button>
    </div>
  </div>`;
}

function renderSelectedControls(el) {
  const color = el.type === "text" || el.type === "icon" ? el.color || "#111827" : el.fill || "#111827";
  const bk = state.brandKit || defaultBrandKit();
  const colorControl = bk.colorLockEnabled
    ? `<label class="control">Color <select data-control="color">${Object.values(bk.lockedColors).map((c) => `<option value="${c}" ${c.toLowerCase() === color.toLowerCase() ? "selected" : ""}>${c}</option>`).join("")}</select></label>`
    : `<label class="control">Color <input type="color" value="${color}" data-control="color"></label>`;
  return `
    ${colorControl}
    ${el.type === "text" || el.type === "icon" ? `<label class="control">Size <input type="range" min="12" max="180" value="${el.fontSize || Math.min(el.w, el.h)}" data-control="fontSize"></label>` : ""}
    <label class="control">Rotate <input type="range" min="-180" max="180" value="${el.rotate || 0}" data-control="rotate"></label>
    <label class="control">Opacity <input type="range" min="15" max="100" value="${Math.round((el.opacity || 1) * 100)}" data-control="opacity"></label>
  `;
}

function renderElement(el) {
  const pageAnimation = getPage().animation;
  const animationClass = pageAnimation?.id ? ` page-anim page-anim-${pageAnimation.id} page-anim-${pageAnimation.scope || "both"}` : "";
  const remotePeer = collabPeerForSelection(el.id);
  const remoteSelClass = remotePeer ? " remote-selected" : "";
  const remoteSelStyle = remotePeer ? `outline:2px dashed ${remotePeer.color};outline-offset:3px;` : "";
  const common = `left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;opacity:${el.opacity ?? 1};transform:rotate(${el.rotate || 0}deg);${remoteSelStyle}`;
  const selected = isSelected(el) ? "selected" : "";
  const handles = isSelected(el) ? renderTransformHandles() : "";
  if (el.type === "text") {
    return `<div class="slide-element text ${selected}${animationClass}${remoteSelClass}" data-id="${el.id}" style="${common}font-family:${el.fontFamily || "Inter"};font-size:${el.fontSize}px;font-weight:${el.fontWeight};line-height:${el.lineHeight || 1.05};color:${el.color};text-align:${el.align || "left"};">
      <div class="text-content" data-text-content contenteditable="true">${escapeHtml(el.text)}</div>${handles}
    </div>`;
  }
  if (el.type === "image") {
    return `<div class="slide-element image ${selected}${animationClass}${remoteSelClass}" data-id="${el.id}" style="${common}background-image:url('${el.src}')">${handles}</div>`;
  }
  if (el.type === "video") {
    const playing = el.playing !== false;
    const playbackClass = playing ? " is-playing video-fallback-ready" : "";
    return `<div class="slide-element video ${selected}${animationClass}${playbackClass}${remoteSelClass}" data-id="${el.id}" style="${common}background-image:url('${el.poster || ""}')">
      <span class="video-motion-fallback" style="background-image:url('${el.poster || ""}')"></span>
      <video data-canvas-video ${playing ? "data-autoplay-video autoplay" : ""} src="${el.src}" poster="${el.poster || ""}" muted loop playsinline preload="auto"></video>
      <button class="video-play-toggle" data-video-play title="Play or pause">${playing ? "Pause" : "Play"}</button>
      <span class="video-drag-grip" title="Move video"></span>
      ${handles}
    </div>`;
  }
  if (el.type === "icon") {
    return `<div class="slide-element icon ${selected}${animationClass}${remoteSelClass}" data-id="${el.id}" style="${common}font-family:'Segoe UI Symbol','Arial Unicode MS',sans-serif;font-size:${el.fontSize || Math.min(el.w, el.h)}px;color:${el.color || "#111827"};">${iconEntity(el.code)}${handles}</div>`;
  }
  if (el.type === "shapeAsset") {
    const asset = getShapeAsset(el.shapeId) || shapeAssets[0];
    return `<div class="slide-element shape-asset ${asset.kind} ${selected}${animationClass}${remoteSelClass}" data-id="${el.id}" style="${common}"><span class="shape-asset-fill ${asset.kind}" style="${shapeAssetElementStyle(asset, el)}">${shapeAssetElementInner(asset, el)}</span>${handles}</div>`;
  }
  return `<div class="slide-element ${el.type} ${selected}${animationClass}${remoteSelClass}" data-id="${el.id}" style="${common}background:${el.fill || "#2563eb"};border:${el.stroke || "0"}">${handles}</div>`;
}

function renderTransformHandles() {
  return `<span class="rotate-handle" data-rotate contenteditable="false" title="Rotate"></span>
    <span class="resize-handle nw" data-resize="nw" contenteditable="false"></span>
    <span class="resize-handle n" data-resize="n" contenteditable="false"></span>
    <span class="resize-handle ne" data-resize="ne" contenteditable="false"></span>
    <span class="resize-handle e" data-resize="e" contenteditable="false"></span>
    <span class="resize-handle w" data-resize="w" contenteditable="false"></span>
    <span class="resize-handle sw" data-resize="sw" contenteditable="false"></span>
    <span class="resize-handle s" data-resize="s" contenteditable="false"></span>
    <span class="resize-handle se" data-resize="se" contenteditable="false"></span>`;
}

function renderSlidePreview(page, index, scale = 0.076, className = "") {
  return `<span class="slide-preview ${className}" data-live-preview="${index}" style="${pageBackground(page)};width:${CANVAS.w * scale}px;height:${CANVAS.h * scale}px;">
    ${page.elements.map((el) => renderSlidePreviewElement(el, scale)).join("")}
  </span>`;
}

function renderSlidePreviewElement(el, scale) {
  const common = `left:${el.x * scale}px;top:${el.y * scale}px;width:${el.w * scale}px;height:${el.h * scale}px;opacity:${el.opacity ?? 1};transform:rotate(${el.rotate || 0}deg);`;
  if (el.type === "text") {
    return `<i class="slide-preview-el text" style="${common}font-family:${el.fontFamily || "Inter"};font-size:${Math.max(4, el.fontSize * scale)}px;font-weight:${el.fontWeight};line-height:${el.lineHeight || 1.05};color:${el.color};text-align:${el.align || "left"};">${escapeHtml(el.text)}</i>`;
  }
  if (el.type === "image") {
    return `<i class="slide-preview-el image" style="${common}background-image:url('${el.src}')"></i>`;
  }
  if (el.type === "video") {
    return `<i class="slide-preview-el image video-thumb" style="${common}background-image:url('${el.poster || ""}')"><b></b></i>`;
  }
  if (el.type === "icon") {
    return `<i class="slide-preview-el icon-preview" style="${common}font-family:'Segoe UI Symbol','Arial Unicode MS',sans-serif;font-size:${Math.max(5, (el.fontSize || Math.min(el.w, el.h)) * scale)}px;color:${el.color || "#111827"};">${iconEntity(el.code)}</i>`;
  }
  if (el.type === "shapeAsset") {
    const asset = getShapeAsset(el.shapeId) || shapeAssets[0];
    return `<i class="slide-preview-el shape-asset-preview-el ${asset.kind}" style="${common}${shapeAssetElementStyle(asset, el, scale)}">${shapeAssetElementInner(asset, el, scale)}</i>`;
  }
  return `<i class="slide-preview-el ${el.type}" style="${common}background:${el.fill || "#2563eb"};border:${el.stroke || "0"}"></i>`;
}

function slideTransitionClass(page) {
  const name = page.transition?.name || "None";
  if (name === "None") return "";
  return `slide-transition slide-transition-${slug(name)} slide-direction-${page.transition?.direction || "right"}`;
}

function refreshSlidePreviews(index = state.pageIndex) {
  const page = state.pages[index];
  if (!page) return;
  document.querySelectorAll(`[data-live-preview="${index}"]`).forEach((preview) => {
    const scale = preview.clientWidth / CANVAS.w;
    preview.setAttribute("style", `${pageBackground(page)};width:${preview.clientWidth}px;height:${preview.clientHeight}px;`);
    preview.innerHTML = page.elements.map((el) => renderSlidePreviewElement(el, scale)).join("");
  });
}

function renderBottom() {
  return `<div class="bottom-strip">
    <div class="page-tabs">
      ${state.pages.map((page, index) => `<button class="page-tab ${index === state.pageIndex ? "active" : ""}" data-page="${index}">
        ${renderSlidePreview(page, index, 0.078, "page-tab-preview")}
        <span class="page-tab-meta"><b>${index + 1}</b><small>${escapeHtml(page.name)}</small></span>
      </button>`).join("")}
      <button class="icon-btn add-page-mini" title="New page" data-action="add-page">${icons.plus}</button>
    </div>
    <div class="zoom-pill"><button class="icon-btn" data-action="zoom-out">${icons.minus}</button><strong>${Math.round(state.zoom * 100)}%</strong><button class="icon-btn" data-action="zoom-in">${icons.plus}</button></div>
  </div>`;
}

function bindEvents() {
  document.querySelectorAll("[data-tool]").forEach((btn) => btn.addEventListener("click", () => update({ tool: btn.dataset.tool, query: "", panelScrollTop: 0, panelScrollTool: btn.dataset.tool, textBoxMode: false }, false)));
  document.querySelectorAll("[data-category]").forEach((btn) => btn.addEventListener("click", () => update({ activeCategory: btn.dataset.category }, false)));
  document.querySelectorAll("[data-template]").forEach((btn) => btn.addEventListener("click", () => applyTemplate(btn.dataset.template)));
  document.querySelectorAll("[data-add-text]").forEach((btn) => btn.addEventListener("click", () => addText(btn.dataset.addText)));
  document.querySelectorAll("[data-font-style]").forEach((btn) => btn.addEventListener("click", () => applyFontStyle(btn.dataset.fontStyle)));
  document.querySelectorAll("[data-builtin-slide]").forEach((btn) => btn.addEventListener("click", () => applyBuiltinSlide(btn.dataset.builtinSlide)));
  document.querySelectorAll("[data-photo]").forEach((btn) => btn.addEventListener("click", () => addImage(btn.dataset.photo)));
  document.querySelectorAll("[data-video]").forEach((btn) => {
    btn.addEventListener("mouseenter", () => btn.querySelector("video")?.play().catch(() => {}));
    btn.addEventListener("mouseleave", () => {
      const video = btn.querySelector("video");
      if (video) video.pause();
    });
    btn.addEventListener("click", () => addVideo(btn.dataset.video, btn.dataset.poster));
  });
  document.querySelectorAll("[data-canvas-video]").forEach((video) => {
    video.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      const wrapper = video.closest(".slide-element");
      if (wrapper) {
        state.selectedId = wrapper.dataset.id;
        state.selectedIds = [wrapper.dataset.id];
        document.querySelectorAll(".slide-element.selected").forEach((node) => node.classList.remove("selected"));
        wrapper.classList.add("selected");
      }
    });
    video.addEventListener("click", (event) => {
      event.stopPropagation();
      const btn = video.closest(".slide-element")?.querySelector("[data-video-play]");
      if (btn) toggleCanvasVideo(btn);
    });
    video.addEventListener("play", () => {
      const wrapper = video.closest(".slide-element");
      if (wrapper) wrapper.classList.add("is-playing");
      markCanvasVideoReady(video);
      setCanvasVideoPlaying(wrapper, true);
      const btn = wrapper?.querySelector("[data-video-play]");
      if (btn) btn.textContent = "Pause";
    });
    ["loadeddata", "canplay", "playing", "timeupdate"].forEach((eventName) => {
      video.addEventListener(eventName, () => markCanvasVideoReady(video));
    });
    video.addEventListener("pause", () => {
      const wrapper = video.closest(".slide-element");
      if (wrapper) wrapper.classList.remove("is-playing");
      setCanvasVideoPlaying(wrapper, false);
      const btn = wrapper?.querySelector("[data-video-play]");
      if (btn) btn.textContent = "Play";
    });
    video.addEventListener("error", () => {
      const wrapper = video.closest(".slide-element");
      if (wrapper) wrapper.classList.add("video-fallback-ready");
      if (wrapper) wrapper.classList.remove("has-real-video");
    });
  });
  requestAnimationFrame(startCanvasAutoplayVideos);
  document.querySelectorAll("[data-video-play]").forEach((btn) => {
    btn.addEventListener("pointerdown", (event) => event.stopPropagation());
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleCanvasVideo(btn);
    });
  });
  document.querySelectorAll("[data-icon]").forEach((btn) => btn.addEventListener("click", () => addIcon(Number(btn.dataset.icon), btn.dataset.iconName)));
  document.querySelectorAll("[data-shape]").forEach((btn) => btn.addEventListener("click", () => addShape(btn.dataset.shape)));
  document.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", () => handleAction(btn.dataset.action)));
  document.querySelectorAll("[data-share-action]").forEach((btn) => btn.addEventListener("click", () => handleShareAction(btn.dataset.shareAction)));
  document.querySelectorAll("[data-model-action]").forEach((btn) => btn.addEventListener("click", () => handleModelAction(btn.dataset.modelAction, btn.dataset.modelId)));
  document.querySelectorAll("[data-model-field]").forEach((input) => input.addEventListener("input", () => {
    if (input.tagName === "SELECT") return;
    state.modelDraft = { ...(state.modelDraft || makeModelDraft()), [input.dataset.modelField]: input.value, lastTest: "" };
  }));
  document.querySelectorAll("select[data-model-field]").forEach((input) => input.addEventListener("change", () => updateModelDraft(input.dataset.modelField, input.value)));
  document.querySelector("[data-share-person]")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") update({ showDownloadMenu: true, shareMessage: `${event.target.value || "Person"} added to access list` }, false);
  });
  document.querySelector("[data-share-access]")?.addEventListener("change", (event) => update({ showDownloadMenu: true, shareMessage: `Access changed to: ${event.target.value}` }, false));
  document.querySelectorAll("[data-export]").forEach((btn) => btn.addEventListener("click", () => exportDesign(btn.dataset.export)));
  document.querySelectorAll("[data-control]").forEach((input) => input.addEventListener("input", () => updateSelected(input.dataset.control, input.value)));
  document.querySelectorAll("[data-palette]").forEach((btn) => btn.addEventListener("click", () => applyPalette(brandPalettes[Number(btn.dataset.palette)])));
  document.querySelectorAll("[data-bg]").forEach((btn) => btn.addEventListener("click", () => setBackground(btn.dataset.bg)));
  document.querySelectorAll("[data-layer]").forEach((btn) => btn.addEventListener("click", () => update({ selectedId: btn.dataset.layer, selectedIds: [btn.dataset.layer] }, false)));
  document.querySelectorAll("[data-page]").forEach((btn) => btn.addEventListener("click", () => switchPage(Number(btn.dataset.page))));
  document.querySelectorAll("[data-project]").forEach((btn) => btn.addEventListener("click", () => loadProject(btn.dataset.project)));
  document.querySelectorAll("[data-animation-option]").forEach((btn) => btn.addEventListener("click", () => setAnimationOption(btn.dataset.animationOption)));
  document.querySelectorAll("[data-animation-scope]").forEach((btn) => btn.addEventListener("click", () => setAnimationScope(btn.dataset.animationScope)));
  document.querySelectorAll("[data-transition-option]").forEach((btn) => btn.addEventListener("click", () => setTransitionOption(btn.dataset.transitionOption)));
  document.querySelector("[data-transition-duration]")?.addEventListener("input", (event) => setTransitionDuration(event.target.value));
  document.querySelector("[data-transition-direction]")?.addEventListener("change", (event) => setTransitionDirection(event.target.value));
  document.querySelector("[data-ai-topic]")?.addEventListener("input", (event) => (state.aiTopic = event.target.value));
  document.querySelector("[data-ai-slides]")?.addEventListener("input", (event) => (state.aiSlides = event.target.value));
  document.querySelector("[data-ai-tone]")?.addEventListener("change", (event) => (state.aiTone = event.target.value));
  document.querySelector("[data-ai-autophotos]")?.addEventListener("change", (event) => (state.aiAutoPhotos = event.target.checked));
  document.querySelectorAll(".slide-element").forEach((el) => {
    el.addEventListener("pointerdown", startDrag);
    if (el.classList.contains("text")) {
      el.addEventListener("dblclick", () => focusEditableText(el));
      el.addEventListener("focusout", () => syncText(el));
    }
    el.addEventListener("input", () => syncText(el));
  });
  if (state.focusTextId) {
    const target = document.querySelector(`.slide-element.text[data-id="${state.focusTextId}"]`);
    state.focusTextId = null;
    if (target) requestAnimationFrame(() => focusEditableText(target));
  }
  document.querySelector("[data-slide]")?.addEventListener("pointerdown", (event) => {
    if (state.textBoxMode) return startTextBoxDraw(event);
    if (event.target.dataset.slide !== undefined) update({ selectedId: null, selectedIds: [] }, false);
  });
  document.querySelector("[data-search]")?.addEventListener("input", (event) => {
    update({ query: event.target.value }, false);
    if (state.tool === "photos") schedulePhotoSearch();
  });
  document.querySelector("[data-project-name]")?.addEventListener("input", (event) => {
    state.projectName = event.target.value;
    pushCollabState();
  });
  document.querySelector("[data-upload]")?.addEventListener("change", handleUpload);
  document.querySelector("[data-brand-logo]")?.addEventListener("change", (event) => handleBrandLogoUpload(event.target));
  document.querySelector("[data-brand-logo-width]")?.addEventListener("input", (event) => updateBrandKit({ logoWidth: Number(event.target.value) || 120 }));
  document.querySelector("[data-brand-logo-height]")?.addEventListener("input", (event) => updateBrandKit({ logoHeight: Number(event.target.value) || 40 }));
  document.querySelector("[data-brand-clear-logo]")?.addEventListener("click", () => updateBrandKit({ logo: null }));
  document.querySelector("[data-brand-primary-font]")?.addEventListener("change", (event) => updateBrandKit({ primaryFont: event.target.value }));
  document.querySelector("[data-brand-secondary-font]")?.addEventListener("change", (event) => updateBrandKit({ secondaryFont: event.target.value }));
  document.querySelector("[data-brand-font-lock]")?.addEventListener("change", (event) => updateBrandKit({ fontLockEnabled: event.target.checked }));
  document.querySelector("[data-brand-color-lock]")?.addEventListener("change", (event) => updateBrandKit({ colorLockEnabled: event.target.checked }));
  document.querySelectorAll("[data-brand-color]").forEach((input) => input.addEventListener("input", (event) => {
    const lockedColors = { ...(state.brandKit?.lockedColors || defaultBrandKit().lockedColors), [input.dataset.brandColor]: event.target.value };
    updateBrandKit({ lockedColors });
  }));
  document.querySelector("[data-brand-reset-colors]")?.addEventListener("click", () => updateBrandKit({ lockedColors: defaultBrandKit().lockedColors }));
  document.querySelector("[data-brand-export-colors]")?.addEventListener("click", () => exportBrandKitJson("palette"));
  document.querySelector("[data-brand-apply]")?.addEventListener("click", () => applyBrandKit());
  document.querySelector("[data-brand-restyle]")?.addEventListener("click", () => magicRestyle());
  document.querySelector("[data-brand-export]")?.addEventListener("click", () => exportBrandKitJson());
  document.querySelector("[data-brand-import]")?.addEventListener("click", () => importBrandKitJson());
  document.querySelector("[data-brand-reset]")?.addEventListener("click", () => { if (confirm("Reset brand kit to default?")) updateBrandKit(defaultBrandKit(), true); });
}

function handleKeyboard(event) {
  if (event.target.matches("input, textarea, select, [contenteditable='true']")) return;
  const commandKey = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (commandKey && key === "z" && event.shiftKey) {
    event.preventDefault();
    return redo();
  }
  if (commandKey && key === "z") {
    event.preventDefault();
    return undo();
  }
  if (commandKey && key === "y") {
    event.preventDefault();
    return redo();
  }
  if (commandKey && key === "a") {
    event.preventDefault();
    return selectAllElements();
  }
  if ((event.key === "Delete" || event.key === "Backspace") && getSelectedIds().length) {
    event.preventDefault();
    return handleAction("delete");
  }
}

function selectCanvasElement(item, options = {}) {
  const alreadySelected = state.selectedId === item.id && state.selectedIds.length === 1 && state.selectedIds[0] === item.id;
  const shouldRender = !alreadySelected || options.forceRender;
  state.selectedId = item.id;
  state.selectedIds = [item.id];
  if (options.focusText && shouldRender) state.focusTextId = item.id;
  if (shouldRender) render();
  pushCollabPresence();
  return alreadySelected;
}

function startDrag(event) {
  if (state.textBoxMode) return;
  const target = event.currentTarget;
  const item = getPage().elements.find((el) => el.id === target.dataset.id);
  if (!item) return;
  if (event.target.dataset.rotate !== undefined) return startRotate(event, item, target);
  if (event.target.dataset.resize) return startResize(event, item, target, event.target.dataset.resize);
  if (item.type === "video" && !event.target.classList.contains("video-drag-grip")) {
    const alreadySelected = selectCanvasElement(item);
    if (alreadySelected) {
      document.querySelectorAll(".slide-element.selected").forEach((node) => node.classList.remove("selected"));
      target.classList.add("selected");
    }
    return;
  }
  if (item.type === "text") {
    const now = performance.now();
    const isRepeatTextClick = state.lastTextClick?.id === item.id && now - state.lastTextClick.time < 450;
    state.lastTextClick = { id: item.id, time: now };
    if (event.detail >= 2 || isRepeatTextClick) {
      event.preventDefault();
      event.stopPropagation();
      selectCanvasElement(item, { focusText: true, forceRender: true });
      return;
    }
    const editable = target.querySelector("[data-text-content]");
    if (document.activeElement === editable && event.target.closest("[data-text-content]")) return;
  }
  state.selectedId = item.id;
  state.selectedIds = [item.id];
  event.preventDefault();
  saveHistory();
  const start = { x: event.clientX, y: event.clientY, itemX: item.x, itemY: item.y };
  try { target.setPointerCapture(event.pointerId); } catch {}
  target.onpointermove = (move) => {
    item.x = clamp(Math.round(start.itemX + (move.clientX - start.x) / state.zoom), -item.w + 24, CANVAS.w - 24);
    item.y = clamp(Math.round(start.itemY + (move.clientY - start.y) / state.zoom), -item.h + 24, CANVAS.h - 24);
    target.style.left = `${item.x}px`;
    target.style.top = `${item.y}px`;
    refreshSlidePreviews();
  };
  target.onpointerup = () => {
    target.onpointermove = null;
    render();
    pushCollabState();
  };
}

function startTextBoxDraw(event) {
  const slide = event.currentTarget;
  const start = slidePoint(event, slide);
  const draft = document.createElement("span");
  const item = {
    id: crypto.randomUUID(),
    type: "text",
    x: start.x,
    y: start.y,
    w: 160,
    h: 48,
    text: "",
    fontSize: 24,
    fontWeight: 400,
    lineHeight: 1.2,
    color: "#000000",
    fontFamily: "Inter",
    autoFit: true,
  };
  let moved = false;

  event.preventDefault();
  event.stopPropagation();
  saveHistory();
  draft.className = "text-box-draft";
  slide.appendChild(draft);
  updateTextBoxDraft(item, draft, start, start);

  const draw = (moveEvent) => {
    moved = true;
    updateTextBoxDraft(item, draft, start, slidePoint(moveEvent, slide));
  };
  const finish = () => {
    document.removeEventListener("pointermove", draw);
    document.removeEventListener("pointerup", finish);
    document.removeEventListener("pointercancel", finish);
    draft.remove();
    if (!moved) {
      item.w = 360;
      item.h = 82;
      item.x = clamp(item.x, 0, CANVAS.w - item.w);
      item.y = clamp(item.y, 0, CANVAS.h - item.h);
    }
    item.minH = item.h;
    getPage().elements.push(item);
    state.future = [];
    state.selectedId = item.id;
    state.selectedIds = [item.id];
    state.focusTextId = item.id;
    state.textBoxMode = false;
    render();
    pushCollabState();
  };

  document.addEventListener("pointermove", draw);
  document.addEventListener("pointerup", finish);
  document.addEventListener("pointercancel", finish);
}

function updateTextBoxDraft(item, draft, start, current) {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  item.x = clamp(Math.round(x), 0, CANVAS.w - 36);
  item.y = clamp(Math.round(y), 0, CANVAS.h - 28);
  item.w = clamp(Math.round(Math.abs(current.x - start.x)), 36, CANVAS.w - item.x);
  item.h = clamp(Math.round(Math.abs(current.y - start.y)), 28, CANVAS.h - item.y);
  Object.assign(draft.style, {
    left: `${item.x}px`,
    top: `${item.y}px`,
    width: `${item.w}px`,
    height: `${item.h}px`,
  });
}

function slidePoint(event, slide) {
  const rect = slide.getBoundingClientRect();
  return {
    x: clamp(Math.round((event.clientX - rect.left) / state.zoom), 0, CANVAS.w),
    y: clamp(Math.round((event.clientY - rect.top) / state.zoom), 0, CANVAS.h),
  };
}

function toggleCanvasVideo(btn) {
  const wrapper = btn.closest(".slide-element");
  const video = wrapper?.querySelector("video");
  if (!wrapper || !video) return;
  if (wrapper.classList.contains("is-playing")) {
    video.pause();
    wrapper.classList.remove("is-playing");
    setCanvasVideoPlaying(wrapper, false);
    btn.textContent = "Play";
    return;
  }
  wrapper.classList.add("is-playing", "video-fallback-ready");
  setCanvasVideoPlaying(wrapper, true);
  btn.textContent = "Pause";
  video.muted = true;
  const playAttempt = video.play();
  if (playAttempt?.catch) {
    playAttempt.catch(() => {
      wrapper.classList.add("is-playing", "video-fallback-ready");
      btn.textContent = "Pause";
    });
  }
}

function startCanvasAutoplayVideos() {
  document.querySelectorAll("[data-autoplay-video]").forEach((video) => {
    const wrapper = video.closest(".slide-element");
    if (!wrapper || !wrapper.classList.contains("is-playing")) return;
    markCanvasVideoReady(video);
    video.muted = true;
    const playAttempt = video.play();
    if (playAttempt?.catch) {
      playAttempt.catch(() => {
        wrapper.classList.add("video-fallback-ready");
      });
    }
  });
}

function markCanvasVideoReady(video) {
  const wrapper = video.closest(".slide-element");
  if (!wrapper) return;
  if (video.readyState >= 2 || video.currentTime > 0) {
    wrapper.classList.add("has-real-video");
  }
}

function setCanvasVideoPlaying(wrapper, playing) {
  if (!wrapper) return;
  const item = getPage().elements.find((el) => el.id === wrapper.dataset.id);
  if (item?.type === "video") item.playing = playing;
}

function startResize(event, item, target, handle = "se") {
  event.preventDefault();
  event.stopPropagation();
  saveHistory();
  const start = { x: event.clientX, y: event.clientY, itemX: item.x, itemY: item.y, w: item.w, h: item.h };
  try { target.setPointerCapture(event.pointerId); } catch {}
  target.onpointermove = (move) => {
    const dx = Math.round((move.clientX - start.x) / state.zoom);
    const dy = Math.round((move.clientY - start.y) / state.zoom);
    const minW = 24;
    const minH = item.type === "line" ? 4 : 18;
    if (handle.includes("e")) item.w = Math.max(minW, start.w + dx);
    if (handle.includes("s")) item.h = Math.max(minH, start.h + dy);
    if (handle.includes("w")) {
      const nextW = Math.max(minW, start.w - dx);
      item.x = start.itemX + start.w - nextW;
      item.w = nextW;
    }
    if (handle.includes("n")) {
      const nextH = Math.max(minH, start.h - dy);
      item.y = start.itemY + start.h - nextH;
      item.h = nextH;
    }
    target.style.left = `${item.x}px`;
    target.style.top = `${item.y}px`;
    target.style.width = `${item.w}px`;
    target.style.height = `${item.h}px`;
    if (item.type === "icon") {
      item.fontSize = Math.max(12, Math.round(Math.min(item.w, item.h) * 0.78));
      target.style.fontSize = `${item.fontSize}px`;
    }
    refreshSlidePreviews();
  };
  target.onpointerup = () => {
    target.onpointermove = null;
    render();
    pushCollabState();
  };
}

function startRotate(event, item, target) {
  event.preventDefault();
  event.stopPropagation();
  saveHistory();
  const box = target.getBoundingClientRect();
  const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  const startAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x);
  const startRotateValue = item.rotate || 0;
  try { target.setPointerCapture(event.pointerId); } catch {}
  target.onpointermove = (move) => {
    const angle = Math.atan2(move.clientY - center.y, move.clientX - center.x);
    item.rotate = Math.round(startRotateValue + ((angle - startAngle) * 180) / Math.PI);
    target.style.transform = `rotate(${item.rotate}deg)`;
    refreshSlidePreviews();
  };
  target.onpointerup = () => {
    target.onpointermove = null;
    render();
    pushCollabState();
  };
}

function focusEditableText(target) {
  const editable = target?.matches?.("[data-text-content]") ? target : target?.querySelector?.("[data-text-content]");
  if (!editable || !editable.isContentEditable) return;
  editable.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editable);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function handleAction(action) {
  const selected = getSelected();
  if (action === "download") return update({ showDownloadMenu: !state.showDownloadMenu, shareView: "main", shareMessage: "" }, false);
  if (action === "export-ppt") return exportDesign("ppt");
  if (action === "export-pdf") return exportDesign("pdf");
  if (action === "export-html") return exportDesign("html");
  if (action === "export-pngs") return exportDesign("pngs");
  if (action === "export-mp4") return exportDesign("mp4");
  if (action === "save-project") return saveCurrentProject();
  if (action === "new-deck") return newPresentationDeck();
  if (action === "add-title-slide") return addPresentationSlide("title");
  if (action === "add-agenda-slide") return addPresentationSlide("agenda");
  if (action === "add-content-slide") return addPresentationSlide("content");
  if (action === "add-chart-slide") return addPresentationSlide("chart");
  if (action === "generate-ai-ppt") return generateAiPpt();
  if (action === "remix-layout") return remixLayout();
  if (action === "regenerate-slide") return regenerateSlide();
  if (action === "toggle-collab") return toggleCollab();
  if (action === "save-as-template") return saveAsTemplate();
  if (action === "use-template") return useTemplate();
  if (action === "delete-template") return deleteTemplate();
  if (action === "marketplace-category") return setMarketplaceCategory();
  if (action === "marketplace-sort") return setMarketplaceSort();
  if (action === "remove-animations") return removeAnimations();
  if (action === "apply-animation-all") return applyAnimationToAllPages();
  if (action === "preview") return update({ zoom: state.zoom < 0.9 ? 0.9 : 0.62 }, false);
  if (action === "beautify") return beautify();
  if (action === "text-box-mode") return update({ tool: "text", textBoxMode: !state.textBoxMode, selectedId: null, selectedIds: [] }, false);
  if (action === "add-page") return addPage();
  if (action === "duplicate-page") return duplicatePage();
  if (action === "zoom-in") return update({ zoom: Math.min(1.15, state.zoom + 0.05) }, false);
  if (action === "zoom-out") return update({ zoom: Math.max(0.28, state.zoom - 0.05) }, false);
  if (action === "undo") return undo();
  if (action === "redo") return redo();
  if (!selected && !getSelectedIds().length) return;
  if (action === "delete") return commit(() => removeSelected());
  if (action === "duplicate") return commit(() => duplicateSelectedElements());
  if (!selected) return;
  if (action === "bring-front") return commit(() => moveLayer(selected, 1));
  if (action === "send-back") return commit(() => moveLayer(selected, -1));
}

function handleShareAction(action) {
  if (action === "copy-link") return copyShareLink("Link copied");
  if (action === "custom-link") return copyShareLink("Custom link copied");
  if (action === "public-link") return copyShareLink("Public view link copied");
  if (action === "download") return exportDesign("png");
  if (action === "present") return presentDesign();
  if (action === "powerpoint") return update({ showDownloadMenu: true, shareView: "powerpoint", shareMessage: "" }, false);
  if (action === "back-main") return update({ showDownloadMenu: true, shareView: "main", shareMessage: "" }, false);
  if (action === "download-powerpoint") return exportDesign("ppt");
  if (action === "embed") return copyEmbedCode();
  if (action === "see-all") return update({ showShareMore: !state.showShareMore, shareMessage: "" }, false);
  if (action === "settings") return update({ shareMessage: "Share settings are ready." }, false);
  if (action === "add-person") return update({ shareMessage: "Type a name or email in Add people." }, false);
  if (action === "whatsapp") return openShareUrl(`https://wa.me/?text=${encodeURIComponent(shareText())}`, "WhatsApp opened");
  if (action === "instagram") return openShareUrl("https://www.instagram.com/", "Instagram opened");
}

function handleModelAction(action, modelId = "") {
  if (action === "new") return update({ showModelModal: true, modelEditingId: "", modelDraft: makeModelDraft(), modelStatus: "" }, false);
  if (action === "close") return update({ showModelModal: false, modelEditingId: "", modelDraft: null }, false);
  if (action === "edit") {
    const model = state.modelConfigs.find((item) => item.id === modelId);
    if (!model) return;
    return update({ showModelModal: true, modelEditingId: model.id, modelDraft: { ...model }, modelStatus: "" }, false);
  }
  if (action === "delete") {
    if (!window.confirm("Delete this saved model config from this browser?")) return;
    state.modelConfigs = state.modelConfigs.filter((item) => item.id !== modelId);
    if (state.activeModelId === modelId) state.activeModelId = "";
    persistModelConfigs();
    return render();
  }
  if (action === "toggle-active") {
    state.activeModelId = state.activeModelId === modelId ? "" : modelId;
    localStorage.setItem("studio-active-model-id", state.activeModelId);
    state.modelStatus = state.activeModelId ? "Model activated. AI PPT Generator ab isi model ko use karega." : "Model deactivated. Local fallback active hai.";
    return render();
  }
  if (action === "save") return saveModelDraft();
  if (action === "test") return testSavedModel(modelId);
  if (action === "test-draft") return testDraftModel();
}

function updateModelDraft(field, value) {
  const draft = { ...(state.modelDraft || makeModelDraft()), [field]: value };
  if (field === "provider") {
    const provider = modelProviders[value] || modelProviders.custom;
    draft.protocol = provider.protocol;
    draft.baseUrl = provider.baseUrl;
  }
  draft.lastTest = "";
  state.modelDraft = draft;
  render();
}

function saveModelDraft() {
  const draft = sanitizeModelConfig(state.modelDraft || makeModelDraft());
  if (!draft.provider || !draft.modelId || !draft.baseUrl) {
    state.modelStatus = "Error: Provider, Model ID, aur Base URL required hain.";
    return render();
  }
  const existingIndex = state.modelConfigs.findIndex((item) => item.id === state.modelEditingId);
  const saved = { ...draft, id: state.modelEditingId || crypto.randomUUID(), updatedAt: new Date().toISOString() };
  if (existingIndex >= 0) state.modelConfigs.splice(existingIndex, 1, saved);
  else state.modelConfigs.unshift(saved);
  if (!state.activeModelId) state.activeModelId = saved.id;
  persistModelConfigs();
  state.showModelModal = false;
  state.modelEditingId = "";
  state.modelDraft = null;
  state.modelStatus = "Model saved. Activate karke AI PPT generation me use kar sakte hain.";
  render();
}

async function testSavedModel(modelId) {
  const model = state.modelConfigs.find((item) => item.id === modelId);
  if (!model) return;
  state.modelStatus = "Testing connection...";
  render();
  const result = await callConfiguredModel(model, [{ role: "user", content: "Reply with OK only." }], { maxTokens: 16 });
  model.lastTest = result.ok ? "ok" : "error";
  model.lastError = result.ok ? "" : result.error;
  persistModelConfigs();
  state.modelStatus = result.ok ? "Connection successful." : `Error: ${result.error}`;
  render();
}

async function testDraftModel() {
  const draft = sanitizeModelConfig(state.modelDraft || makeModelDraft());
  state.modelDraft = { ...draft, lastTest: "" };
  state.modelStatus = "Testing connection...";
  render();
  const result = await callConfiguredModel(draft, [{ role: "user", content: "Reply with OK only." }], { maxTokens: 16 });
  state.modelDraft = { ...draft, lastTest: result.ok ? "ok" : "error", lastError: result.ok ? "" : result.error };
  state.modelStatus = result.ok ? "Connection successful." : `Error: ${result.error}`;
  render();
}

function addImage(src) {
  commit(() => {
    const id = crypto.randomUUID();
    getPage().elements.push({ id, type: "image", x: 318, y: 130, w: 330, h: 260, src });
    state.selectedId = id;
    state.selectedIds = [id];
  });
}

function addVideo(src, poster) {
  commit(() => {
    const id = crypto.randomUUID();
    getPage().elements.push({ id, type: "video", x: 260, y: 120, w: 440, h: 260, src, poster, playing: true });
    state.selectedId = id;
    state.selectedIds = [id];
  });
}

function addIcon(code, name = "Icon") {
  commit(() => {
    const id = crypto.randomUUID();
    getPage().elements.push({
      id,
      type: "icon",
      x: 390,
      y: 190,
      w: 150,
      h: 150,
      code,
      name,
      color: "#111827",
      fontSize: 118,
      opacity: 1,
    });
    state.selectedId = id;
    state.selectedIds = [id];
  });
}

function addText(kind) {
  const presets = {
    textbox: { text: "", fontSize: 24, fontWeight: 400, w: 360, h: 82, lineHeight: 1.2, autoFit: true, minH: 82 },
    heading: { text: "Add a headline", fontSize: 58, fontWeight: 850, w: 560, h: 76 },
    subheading: { text: "Add a subheading", fontSize: 32, fontWeight: 750, w: 470, h: 48 },
    body: { text: "Add a little more detail here.", fontSize: 23, fontWeight: 500, w: 430, h: 88, lineHeight: 1.25 },
    quote: { text: "Make it memorable", fontSize: 44, fontWeight: 800, w: 460, h: 74, fontFamily: "Georgia" },
  };
  const stylePreset = textStylePresets.find((preset) => preset.id === kind);
  if (stylePreset) {
    presets[kind] = {
      text: stylePreset.text,
      fontSize: stylePreset.fontSize,
      fontWeight: stylePreset.fontWeight,
      fontFamily: stylePreset.fontFamily,
      color: stylePreset.color,
      w: stylePreset.w,
      h: stylePreset.h,
      lineHeight: stylePreset.lineHeight,
    };
  }
  commit(() => {
    const id = crypto.randomUUID();
    getPage().elements.push({ id, type: "text", x: 110, y: 145, color: kind === "textbox" ? "#000000" : "#111827", fontFamily: "Inter", ...presets[kind] });
    state.selectedId = id;
    state.selectedIds = [id];
    state.focusTextId = id;
    state.textBoxMode = false;
  });
}

function applyFontStyle(font) {
  const selected = getSelected();
  if (selected?.type === "text") {
    return commit(() => {
      selected.fontFamily = font;
    });
  }
  commit(() => {
    const id = crypto.randomUUID();
    getPage().elements.push({
      id,
      type: "text",
      x: 120,
      y: 150,
      w: 560,
      h: 80,
      text: font,
      fontSize: 42,
      fontWeight: 500,
      lineHeight: 1.1,
      color: "#111827",
      fontFamily: font,
    });
    state.selectedId = id;
    state.selectedIds = [id];
    state.focusTextId = id;
  });
}

function applyBuiltinSlide(layoutId) {
  commit(() => {
    const page = makeBuiltinSlide(layoutId);
    state.pages.splice(state.pageIndex + 1, 0, page);
    state.pageIndex += 1;
    state.selectedId = null;
    state.selectedIds = [];
    state.textBoxMode = false;
    state.tool = "text";
  });
}

function makeBuiltinSlide(layoutId) {
  const page = makeBlankPage(builtinSlideLayouts.find((layout) => layout.id === layoutId)?.name || "Built-in Slide");
  page.background = "#ffffff";
  const title = () => text(70, 48, 820, 56, "Click to add title", 42, 700, "#111827");
  const contentBox = (x, y, w, h, label = "Click to add text") => [
    { id: crypto.randomUUID(), type: "frame", x, y, w, h, fill: "transparent", stroke: "2px dashed #94a3b8" },
    text(x + 24, y + 28, w - 48, 44, label, 26, 500, "#64748b"),
  ];
  const pictureBox = (x, y, w, h) => [
    { id: crypto.randomUUID(), type: "frame", x, y, w, h, fill: "transparent", stroke: "2px dashed #94a3b8" },
    text(x + 24, y + h / 2 - 18, w - 48, 40, "Paste or add picture", 24, 600, "#64748b"),
  ];
  if (layoutId === "blank") return page;
  if (layoutId === "title") {
    page.elements = [
      text(110, 160, 740, 74, "Click to add title", 54, 750, "#111827"),
      text(160, 254, 640, 48, "Click to add subtitle", 28, 500, "#475569"),
    ];
  } else if (layoutId === "section") {
    page.elements = [
      shape("rect", 0, 0, 960, 540, "#f1f5f9"),
      text(100, 190, 760, 74, "Click to add section title", 52, 800, "#111827"),
      shape("rect", 100, 290, 320, 8, "#2563eb"),
    ];
  } else if (layoutId === "two-content") {
    page.elements = [title(), ...contentBox(70, 136, 390, 330), ...contentBox(500, 136, 390, 330)];
  } else if (layoutId === "comparison") {
    page.elements = [
      title(),
      text(115, 122, 300, 36, "Heading", 24, 700, "#111827"),
      text(545, 122, 300, 36, "Heading", 24, 700, "#111827"),
      ...contentBox(70, 168, 390, 298),
      ...contentBox(500, 168, 390, 298),
    ];
  } else if (layoutId === "title-only") {
    page.elements = [title()];
  } else if (layoutId === "caption") {
    page.elements = [
      ...contentBox(86, 74, 788, 270),
      text(86, 380, 788, 52, "Click to add caption", 34, 700, "#111827"),
      text(86, 434, 788, 38, "Click to add supporting text", 22, 500, "#64748b"),
    ];
  } else if (layoutId === "picture-caption") {
    page.elements = [
      ...pictureBox(70, 110, 350, 320),
      text(470, 142, 390, 52, "Click to add caption", 34, 700, "#111827"),
      text(470, 210, 390, 130, "Click to add supporting text", 24, 500, "#64748b"),
    ];
  } else {
    page.elements = [title(), ...contentBox(110, 145, 740, 300)];
  }
  return page;
}

function addShape(type) {
  const asset = getShapeAsset(type);
  if (asset) {
    commit(() => {
      const id = crypto.randomUUID();
      const size = asset.kind === "grid" ? { w: 260, h: 170 } : asset.kind === "line" ? { w: 300, h: 34 } : { w: 140, h: 140 };
      getPage().elements.push({
        id,
        type: "shapeAsset",
        shapeId: asset.id,
        name: asset.name,
        x: asset.kind === "line" ? 330 : 380,
        y: asset.kind === "line" ? 252 : 200,
        ...size,
        fill: asset.kind === "line" ? "#111827" : "#bfbfbf",
        opacity: 1,
      });
      state.selectedId = id;
      state.selectedIds = [id];
    });
    return;
  }
  const sizes = {
    line: { w: 260, h: 6 },
    pill: { w: 210, h: 64 },
    frame: { w: 260, h: 180, stroke: "6px solid #111827", fill: "transparent" },
    ribbon: { w: 260, h: 74 },
    badge: { w: 130, h: 130 },
  };
  commit(() => {
    const id = crypto.randomUUID();
    getPage().elements.push({ id, type, x: 360, y: 210, w: 130, h: 130, fill: "#2563eb", ...(sizes[type] || {}) });
    state.selectedId = id;
    state.selectedIds = [id];
  });
}

function newPresentationDeck() {
  commit(() => {
    state.projectName = "Untitled presentation";
    state.pages = [makePresentationSlide("title", "Untitled presentation", "Build your story slide by slide", 0)];
    state.pageIndex = 0;
    state.selectedId = null;
    state.selectedIds = [];
    state.textBoxMode = false;
    state.tool = "ppt";
  });
}

function addPresentationSlide(kind) {
  commit(() => {
    const titleByKind = {
      title: "Presentation Title",
      agenda: "Agenda",
      content: "Key Message",
      chart: "Performance Snapshot",
    };
    state.pages.push(makePresentationSlide(kind, titleByKind[kind], "Add your supporting message here", state.pages.length));
    state.pageIndex = state.pages.length - 1;
    state.selectedId = null;
    state.selectedIds = [];
    state.textBoxMode = false;
    state.tool = "ppt";
  });
}

function makePresentationSlide(kind, titleValue, subtitle, index) {
  const palettes = [
    ["#3b0f97", "#f8fafc", "#00d35f", "#facc15"],
    ["#0f172a", "#ffffff", "#2563eb", "#f97316"],
    ["#173b85", "#f8fafc", "#22d3ee", "#ffffff"],
    ["#111827", "#ffffff", "#a855f7", "#10b981"],
  ];
  const [ink, paper, accent, pop] = palettes[index % palettes.length];
  const page = makeBlankPage(titleValue);
  if (kind === "title") {
    page.background = `linear-gradient(135deg, ${ink}, #1d0b54)`;
    page.elements = [
      shape("circle", 700, 115, 210, 210, pop, 0.22),
      shape("rect", 650, 330, 260, 130, accent, 0.85),
      text(86, 138, 560, 70, subtitle.toUpperCase(), 34, 850, accent),
      text(86, 214, 620, 150, titleValue.toUpperCase(), 67, 900, "#ffffff"),
      shape("pill", 88, 404, 230, 58, "#0bd452"),
      text(135, 420, 160, 32, "PRESENT", 24, 900, "#ffffff"),
      image(690, 92, 170, 280, photos[(index + 8) % photos.length]),
    ];
  } else if (kind === "agenda") {
    page.background = paper;
    page.elements = [
      text(70, 64, 650, 64, titleValue, 54, 850, ink),
      ...["Overview", "Key insights", "Plan", "Next steps"].map((item, itemIndex) => text(118, 160 + itemIndex * 70, 540, 42, `${itemIndex + 1}. ${item}`, 32, 750, ink)),
      shape("rect", 720, 76, 130, 360, accent, 0.22),
      shape("circle", 690, 350, 170, 170, pop, 0.4),
    ];
  } else if (kind === "chart") {
    page.background = paper;
    page.elements = [
      text(64, 58, 620, 58, titleValue, 48, 850, ink),
      text(68, 120, 560, 42, subtitle, 24, 650, "#64748b"),
      ...[220, 285, 350, 415].map((height, itemIndex) => shape("rect", 122 + itemIndex * 128, 460 - height / 2, 76, height / 2, [accent, pop, ink, "#94a3b8"][itemIndex], 0.95)),
      text(690, 198, 170, 62, "72%", 58, 900, accent),
      text(690, 276, 190, 44, "projected growth", 24, 700, ink),
    ];
  } else {
    page.background = paper;
    page.elements = [
      text(70, 68, 610, 64, titleValue, 52, 850, ink),
      text(74, 148, 540, 78, subtitle, 30, 650, "#475569"),
      shape("rect", 74, 270, 360, 14, accent),
      text(74, 318, 390, 42, "• Add the key point", 27, 700, ink),
      text(74, 372, 390, 42, "• Support it with evidence", 27, 700, ink),
      image(610, 96, 260, 330, photos[(index + 2) % photos.length]),
    ];
  }
  return page;
}

async function generateAiPpt() {
  const topic = (state.aiTopic || "").trim() || "AI generated presentation";
  const slideCount = clamp(Number(state.aiSlides || 8), 3, 12);
  const tone = state.aiTone || "Startup pitch";
  const activeModel = getActiveModel();

  console.group(`[AI PPT] Topic: "${topic}" | Slides: ${slideCount} | Tone: ${tone}`);

  if (activeModel) {
    state.aiGenerating = true;

    // ── Step 1: Reasoning / Strategy ──────────────────────────────────
    console.log(`[Step 1/3] Reasoning started — model: ${activeModel.displayName || activeModel.modelId}`);
    state.aiStatus = `Step 1/3 · Analyzing topic and planning deck strategy...`;
    render();
    const t1 = performance.now();
    const reasonResult = await requestAiReasoning(activeModel, topic, slideCount, tone, state.aiTemplateFamily, state.aiPaletteHint, state.brandKit);
    const t1ms = Math.round(performance.now() - t1);
    const strategy = reasonResult.ok ? reasonResult.strategy : null;

    if (strategy) {
      console.log(`[Step 1/3] ✓ Reasoning complete in ${t1ms}ms`);
      console.log(`  ► topicCategory  : ${strategy.topicCategory}`);
      console.log(`  ► visualStyle    : ${strategy.visualStyle}`);
      console.log(`  ► paletteChoice  : ${strategy.paletteChoice}`);
      console.log(`  ► accentColor    : ${strategy.primaryAccentColor}`);
      console.log(`  ► backgroundDark : ${strategy.backgroundDark}`);
      console.log(`  ► templateFamily : ${strategy.templateFamily}`);
      console.log(`  ► toneVoice      : ${strategy.toneVoice}`);
      console.log(`  ► keyMessages    :`, strategy.keyMessages);
      console.log(`  ► slideTypes     :`, strategy.slideTypes);
      console.log(`  ► storyArc       :`, strategy.storyArc);
      console.log(`  ► visualKeywords :`, strategy.visualKeywords);
    } else {
      console.warn(`[Step 1/3] ✗ Reasoning failed in ${t1ms}ms — will generate without strategy`);
    }

    // Fallback strategy with user preferences if reasoning failed
    const effectiveStrategy = strategy || (
      (state.aiTemplateFamily !== "auto" || state.aiPaletteHint !== "auto") ? {
        templateFamily: state.aiTemplateFamily !== "auto" ? state.aiTemplateFamily : undefined,
        paletteChoice: state.aiPaletteHint !== "auto" ? state.aiPaletteHint : undefined,
        primaryAccentColor: undefined,
        backgroundDark: undefined,
      } : null
    );

    // ── Step 2: Generate deck with strategy context ────────────────────
    console.log(`[Step 2/3] Deck generation started${effectiveStrategy ? " with strategy" : " (no strategy)"}`);
    state.aiStatus = `Step 2/3 · Generating slides${effectiveStrategy ? " with strategy" : ""}...`;
    render();
    const t2 = performance.now();
    const planResult = await requestAiDeckPlan(activeModel, topic, slideCount, tone, effectiveStrategy, state.brandKit);
    const t2ms = Math.round(performance.now() - t2);

    if (planResult.ok) {
      console.log(`[Step 2/3] ✓ Deck plan received in ${t2ms}ms — ${planResult.deck?.slides?.length} slides`);
      planResult.deck?.slides?.forEach((s, i) => {
        console.log(`  Slide ${i + 1}: [${s.type}] "${s.title}"`);
      });

      // ── Step 3: Slide-by-slide content writing (streamed preview) ────
      console.log(`[Step 3/3] Writing slide content — ${planResult.deck.slides.length} slides`);
      state.aiStatus = "Step 3/3 · Setting up live deck preview...";
      render();
      // Show the deck immediately from the outline — slides upgrade live
      // as the writer finishes each one.
      stageAiDeck(planResult.deck, topic, slideCount, tone);
      const t3 = performance.now();
      let writtenSlides = 0;
      for (let i = 0; i < planResult.deck.slides.length; i += 1) {
        state.aiStatus = `Step 3/3 · Writing slide ${i + 1}/${planResult.deck.slides.length} — live preview updating...`;
        render();
        const writerResult = await agentSlideWriter(
          activeModel,
          {
            topic,
            tone,
            strategy,
            deckTitle: planResult.deck.title,
            previousTitles: planResult.deck.slides.slice(0, i).map((s) => s.title).filter(Boolean),
            brand: state.brandKit,
          },
          planResult.deck.slides[i],
          i,
        );
        if (writerResult.ok) {
          planResult.deck.slides[i]._detail = writerResult.detail;
          writtenSlides += 1;
          // Generate AI image for this slide if imagePrompt exists
          const imgPrompt = writerResult.detail?.imagePrompt;
          if (imgPrompt) {
            state.aiStatus = `Step 3/3 · Writing slide ${i + 1}/${planResult.deck.slides.length} — generating image...`;
            render();
            try {
              const imgRes = await fetch("/api/image-gen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: imgPrompt, width: 1024, height: 576 }),
              });
              const imgData = await imgRes.json().catch(() => ({}));
              if (imgData.ok && imgData.imageUrl) {
                writerResult.detail.generatedImage = imgData.imageUrl;
                console.log(`  Slide ${i + 1} image generated: ${imgData.imageUrl}`);
              }
            } catch (e) {
              console.warn(`  Slide ${i + 1} image generation failed:`, e.message);
            }
          }
          const staged = buildDeckPages(planResult.deck, topic, slideCount, tone);
          state.pages = staged.pages;
          state.projectName = staged.title;
          render();
          console.log(`  Slide ${i + 1}: "${planResult.deck.slides[i].title || ""}" → layout ${staged.pages[i]?.aiRender?.recipe || "family"}`);
        } else {
          console.warn(`  Slide ${i + 1} writer skipped: ${writerResult.error}`);
        }
      }
      const t3ms = Math.round(performance.now() - t3);
      console.log(`[Step 3/3] ✓ Slide writing complete in ${t3ms}ms — ${writtenSlides}/${planResult.deck.slides.length} slides enriched`);

      const finalBuilt = buildDeckPages(planResult.deck, topic, slideCount, tone);
      commit(() => {
        state.projectName = finalBuilt.title;
        state.pages = finalBuilt.pages;
        state.selectedId = null;
        state.selectedIds = [];
      });
      enhanceDeckWithPhotos(finalBuilt.pages, planResult.deck, topic);
      state.aiGenerating = false;
      const modelLabel = activeModel.displayName || activeModel.modelId;
      state.aiStatus = `✓ Generated with ${modelLabel}${strategy ? " · Strategy applied" : ""} · ${writtenSlides} slides enriched.`;
      console.log(`[AI PPT] ✓ Done — total time ~${Math.round(t1ms + t2ms + t3ms)}ms`);
      console.groupEnd();
      render();
      saveCurrentProject("AI PPT", false);
      return;
    }
    console.error(`[Step 2/3] ✗ Deck generation failed in ${t2ms}ms:`, planResult.error);
    state.aiGenerating = false;
    state.aiStatus = `Error: ${planResult.error}. Local fallback deck generated.`;
    console.groupEnd();
  } else {
    console.log(`[AI PPT] No model active — using local fallback generator`);
    console.groupEnd();
  }
  generateFallbackAiPpt(topic, slideCount, tone);
}

// ── Remix layout + AI rewrite for a single slide ───────────────────
function remixLayout() {
  const page = getPage();
  const spec = page?.aiRender;
  if (!spec) return;
  const candidates = recipeNamesFor(spec.slide, blocksFromSlide(spec.slide, spec.deck, spec.theme));
  if (!candidates.length) return;
  const current = candidates.indexOf(spec.recipe);
  const next = candidates[(current + 1) % candidates.length];
  const rebuilt = renderBlockSlide(spec.slide, spec.index, spec.total, spec.theme, spec.deck, next);
  commit(() => {
    state.pages[state.pageIndex] = rebuilt;
    state.selectedId = null;
    state.selectedIds = [];
  });
  state.aiStatus = `Layout remixed → ${next}`;
}

async function regenerateSlide() {
  const page = getPage();
  const spec = page?.aiRender;
  if (!spec) return;
  const model = getActiveModel();
  if (!model) {
    update({ aiStatus: "AI Rewrite ke liye Model API se ek model active karein." }, false);
    return;
  }
  state.aiStatus = `Rewriting slide ${spec.index + 1} with ${model.displayName || model.modelId}...`;
  state.aiGenerating = true;
  render();
  const result = await agentRegenerateSlide(
    model,
    {
      topic: spec.deck?.title || state.projectName,
      tone: state.aiTone || "Professional",
      strategy: spec.deck?._strategy || null,
      deckTitle: spec.deck?.title || state.projectName,
      previousTitles: [],
      brand: state.brandKit,
    },
    spec.deck,
    spec.index,
    "",
  );
  if (!result.ok) {
    update({ aiGenerating: false, aiStatus: `Error: ${result.error}` }, false);
    return;
  }
  const detail = result.slide || {};
  const merged = {
    ...spec.slide,
    type: detail.type || spec.slide.type || "content",
    title: detail.title || spec.slide.title,
    subtitle: detail.subtitle !== undefined ? detail.subtitle : spec.slide.subtitle,
    bullets: detail.bullets && detail.bullets.length ? detail.bullets : spec.slide.bullets,
    kicker: detail.kicker,
    statCards: detail.statCards,
    quote: detail.quote,
    chart: detail.chart,
    chips: detail.chips,
    highlight: detail.highlight,
    speakerNote: detail.speakerNote,
    _detail: detail,
  };
  const rebuilt = renderBlockSlide(merged, spec.index, spec.total, spec.theme, spec.deck);
  commit(() => {
    state.pages[state.pageIndex] = rebuilt;
    state.selectedId = null;
    state.selectedIds = [];
  });
  state.aiGenerating = false;
  state.aiStatus = `✓ Slide ${spec.index + 1} rewritten (layout: ${rebuilt.aiRender?.recipe || "auto"})`;
}

// ── Collaboration toggle ────────────────────────────────────────────────
function toggleCollab() {
  if (!window.StudioCollab) {
    update({ aiStatus: "Loading collaboration client...", shareMessage: "" }, false);
    return;
  }
  if (state.collabEnabled) {
    if (state.collabClient) {
      state.collabClient.disconnect();
      state.collabClient = null;
    }
    update({ collabEnabled: false, collabClient: null, collabPeers: [], aiStatus: "Collaboration disabled" }, false);
    return;
  }
  // Enable collab
  const workspace = state.collabWorkspace || "studio-" + Date.now().toString(36);
  const userName = state.collabUserName || "User" + Math.random().toString(36).slice(2, 6);
  update({ aiStatus: "Connecting to collaboration server..." }, false);
  const client = new window.StudioCollab({
    workspace,
    userName,
    onRemoteChange: (value, key) => applyRemoteCollabValue(key, value),
    onAwareness: (states) => {
      const prev = state.collabPeers;
      const next = buildCollabPeers(states);
      const pointerOnly = prev.length === next.length && next.every((peer, i) =>
        peer.clientId === prev[i]?.clientId &&
        peer.pageIndex === prev[i]?.pageIndex &&
        JSON.stringify(peer.selection || []) === JSON.stringify(prev[i]?.selection || [])
      );
      state.collabPeers = next;
      if (pointerOnly) {
        const overlay = document.querySelector("[data-remote-cursors]");
        if (overlay) overlay.innerHTML = renderRemoteCursorNodes();
        const chips = document.querySelector(".collab-presence");
        if (chips) {
          chips.innerHTML = renderCollabChips();
          chips.title = state.collabPeers.map((peer) => peer.user).join(", ");
        }
      } else {
        update({ collabPeers: next }, false);
      }
    },
  });
  state.collabClient = client;
  client.init().then(() => {
    update({ collabEnabled: true, aiStatus: "Collaboration enabled — share workspace link to invite others" }, false);
    client.bindState("pages", state.pages);
    client.bindState("pageIndex", state.pageIndex);
    client.bindState("projectName", state.projectName);
    client.bindState("theme", { palette: state.theme?.palette, dark: state.theme?.dark });
    // Pull any existing collaborative state (new joiner keeps remote wins over local)
    for (const key of ["pages", "pageIndex", "projectName", "theme"]) {
      const value = client.getValue(key);
      if (value !== undefined && value !== null) applyRemoteCollabValue(key, value);
    }
    pushCollabState();
    pushCollabPresence();
  }).catch((err) => {
    console.error("[Collab] Init failed:", err);
    update({ collabEnabled: false, aiStatus: "Collab connection failed: " + err.message }, false);
  });
}

function applyRemoteCollabValue(key, value) {
  if (!state.collabEnabled || !state.collabClient || state.collabClient._localChange) return;
  if (!key) return;
  if (key === "pages" && Array.isArray(value)) {
    if (JSON.stringify(value) === JSON.stringify(state.pages)) return;
    state.pages = value;
    state.pageIndex = clamp(state.pageIndex, 0, Math.max(0, state.pages.length - 1));
    state.selectedId = null;
    state.selectedIds = [];
    render();
  } else if (key === "projectName" && typeof value === "string") {
    if (value === state.projectName) return;
    state.projectName = value;
    render();
  } else if (key === "pageIndex" && typeof value === "number") {
    if (value === state.pageIndex) return;
    switchPage(clamp(value, 0, Math.max(0, state.pages.length - 1)));
  } else if (key === "theme" && value) {
    state.theme = { ...(state.theme || {}), palette: value.palette || state.theme?.palette, dark: value.dark ?? state.theme?.dark };
    render();
  }
}

function buildCollabPeers(states) {
  const myId = state.collabClient?.clientId;
  const now = Date.now();
  const byId = new Map();
  if (states && typeof states === "object") {
    let items;
    if (Array.isArray(states)) items = states;
    else if (states.clientId) items = [states];
    else items = Object.values(states);
    for (const item of items) {
      if (!item || typeof item !== "object" || !item.clientId || item.clientId === myId) continue;
      if (now - (item.ts || 0) > 120000) continue;
      byId.set(item.clientId, { ...item });
    }
  }
  return [...byId.values()].sort((a, b) => (a.user || "").localeCompare(b.user || ""));
}

function pushCollabState() {
  const client = state.collabClient;
  if (!state.collabEnabled || !client) return;
  client.publish("pages", state.pages);
  client.publish("projectName", state.projectName);
  client.publish("pageIndex", state.pageIndex);
}

function pushCollabPresence(extra = {}) {
  const client = state.collabClient;
  if (!state.collabEnabled || !client) return;
  client.setAwareness({
    pageIndex: state.pageIndex,
    selection: getSelectedIds(),
    ...extra,
  });
}

function collabPeerForSelection(elementId) {
  return state.collabPeers.find((peer) => (peer.selection || []).includes(elementId) && peer.pageIndex === state.pageIndex);
}

function renderCollabChips() {
  return state.collabPeers.map((peer) => `<span class="collab-avatar" style="background:${escapeAttr(peer.color || "#64748b")}" title="${escapeAttr(peer.user || "Guest")}">${escapeHtml(String(peer.user || "G").slice(0, 1).toUpperCase())}</span>`).join("") +
    (state.collabPeers.length ? `<small class="collab-count">${state.collabPeers.length}</small>` : "");
}

function renderRemoteCursorNodes() {
  const pageIndex = state.pageIndex;
  const now = Date.now();
  const peers = state.collabPeers.filter((peer) => peer.pageIndex === pageIndex && peer.pointer && now - (peer.ts || 0) < 10000);
  return peers.map((peer) => `<div class="remote-cursor" style="left:${Math.round(peer.pointer.x * state.zoom)}px;top:${Math.round(peer.pointer.y * state.zoom)}px;--rc:${escapeAttr(peer.color || "#64748b")}">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="${escapeAttr(peer.color || "#64748b")}" stroke="#fff" stroke-width="1"><path d="M5 3l14 8-7 2-4 6z"/></svg>
    <span class="remote-cursor-name">${escapeHtml(String(peer.user || "Guest").slice(0, 14))}</span>
  </div>`).join("");
}

// ── Step 1: AI Reasoning — thinks about HOW to make the best PPT ──────────
async function requestAiReasoning(model, topic, slideCount, tone, userTemplateFamily = "auto", userPaletteHint = "auto", userBrand = null) {
  const familyHint = userTemplateFamily !== "auto" ? `USER PREFERENCE: templateFamily MUST be "${userTemplateFamily}". Do not choose a different family.` : "";
  const paletteHint = userPaletteHint !== "auto" ? `USER PREFERENCE: paletteChoice MUST be "${userPaletteHint}". Do not choose a different palette.` : "";
  const brandHint = brandKitActive(userBrand) ? `USER PREFERENCE — BRAND KIT (colors EVERYWHERE must follow this palette):\n${brandPromptBlock(userBrand)}\n` : "";
  const messages = [
    {
      role: "system",
      content: "You are a world-class presentation designer. Think step by step about how to make the most attractive, informative, and visually engaging presentation for the given topic. Return only JSON.",
    },
    {
      role: "user",
      content: `Before building slides for "${topic}", do a strategy analysis.

Think about:
1. What is the BEST visual style for this topic? (dark/light, photo-heavy, infographic, etc.)
2. What color palette fits? (blue for tech/auto, green for nature, etc.)
3. What is the ideal STORY ARC for ${slideCount} slides?
4. What specific IMAGES / VISUALS will make it stunning?
5. What TYPE of slides fit best? (cover, split-photo, stats-cards, challenges-grid, etc.)
6. What TONE and LANGUAGE level fits?

${familyHint ? familyHint + "\n" : ""}${paletteHint ? paletteHint + "\n" : ""}${brandHint ? brandHint + "\n" : ""}

Return this JSON (no markdown, no extra text):
{
  "topicCategory": "technology|automotive|education|health|business|science|environment|food|sports|general",
  "visualStyle": "bold-dark|clean-white|editorial-split|magazine|minimal|colorful",
  "paletteChoice": "blue|green|orange|purple|dark|teal|red|neutral",
  "primaryAccentColor": "#hexcode (the most impactful accent color for this topic)",
  "backgroundDark": true or false,
  "storyArc": ["slide 1 purpose", "slide 2 purpose", ...] (${slideCount} items),
  "slideTypes": ["cover", "definition", ...] (${slideCount} slide type names),
  "visualKeywords": ["word1", "word2", "word3"],
  "toneVoice": "inspirational|educational|professional|bold|conversational",
  "keyMessages": ["top 3 messages the deck should communicate"],
  "templateFamily": "dark-tech|clean-business|editorial-split|agriculture-photo|showcase"
}`,
    },
  ];
  try {
    const result = await callConfiguredModel(model, messages, { maxTokens: 800, json: true });
    if (!result.ok) return { ok: false };
    const strategy = parseAiJson(result.content);
    if (!strategy || !strategy.topicCategory) return { ok: false };
    return { ok: true, strategy };
  } catch {
    return { ok: false };
  }
}

function generateFallbackAiPpt(topic, slideCount, tone) {
  const deck = makeLocalDeckPlan(topic, slideCount, tone);
  // Inject user preferences as strategy overrides so buildGeneratedDeck applies them
  if (state.aiTemplateFamily !== "auto" || state.aiPaletteHint !== "auto") {
    deck._strategy = {
      templateFamily: state.aiTemplateFamily !== "auto" ? state.aiTemplateFamily : null,
      paletteChoice: state.aiPaletteHint !== "auto" ? state.aiPaletteHint : null,
      primaryAccentColor: null,
      backgroundDark: null,
    };
  }
  const generated = buildGeneratedDeck(deck, topic, slideCount, tone, "Local fallback generator");
  commit(() => {
    state.projectName = generated.title;
    state.pages = generated.pages;
    state.pageIndex = 0;
    state.selectedId = null;
    state.selectedIds = [];
    state.tool = "ppt";
  });
  enhanceDeckWithPhotos(generated.pages, deck, topic);
  saveCurrentProject("AI PPT", false);
}

async function requestAiDeckPlan(model, topic, slideCount, tone, strategy = null, brand = null) {
  // Build strategy context block if Step 1 reasoning succeeded
  const brandHint = brandKitActive(brand) ? `\nBRAND KIT (the deck design MUST follow this palette and font pairing):\n${brandPromptBlock(brand)}\n` : "";
  const strategyContext = strategy ? `
DESIGN STRATEGY (already decided in Step 1 — follow this exactly):
- Topic category: ${strategy.topicCategory}
- Visual style: ${strategy.visualStyle}
- Palette: ${strategy.paletteChoice} (accent: ${strategy.primaryAccentColor || "auto"})
- Dark background: ${strategy.backgroundDark}
- Template family: ${strategy.templateFamily}
- Tone/voice: ${strategy.toneVoice}
- Key messages to communicate: ${(strategy.keyMessages || []).join("; ")}
- Planned slide types (use these): ${(strategy.slideTypes || []).join(", ")}
- Story arc: ${(strategy.storyArc || []).join(" → ")}
- Visual keywords for images: ${(strategy.visualKeywords || []).join(", ")}

The slide types list above gives you the planned structure — create slides that match those purposes in order.
The paletteHint in your JSON must match: "${strategy.paletteChoice || "blue"}".
` : "";

  const messages = [
    {
      role: "system",
      content: "You are a senior presentation strategist and Canva-style deck designer. Return only valid JSON. Do not wrap the response in markdown. Be accurate, relevant, and conservative with facts.",
    },
    {
      role: "user",
      content: `Create a complete ${slideCount}-slide presentation for this exact user topic: "${topic}". Tone label: ${tone}.
${strategyContext}${brandHint}
Interpretation rules:
- If the topic is a broad noun or short phrase such as "farmer", "teacher", "water", or "organic farming", create an educational/overview deck about that topic. Do not turn it into a startup, product, app, SaaS, operating system, or investor pitch unless the user topic explicitly asks for that.
- The tone label is style guidance only. "Startup pitch" must not force a product pitch when the user gave a broad topic.
- Do not invent company/product names, market sizes, precise dollar amounts, percentages, dates, named subscriptions, or named competitors unless the user topic explicitly provides them.
- If numbers are not provided, write qualitative content like "income pressure", "weather risk", "market access", "soil health", and "technology support" instead of fake statistics.
- Pick visuals that directly match the topic. For "farmer", prefer fields, crops, soil, irrigation, farmer work, harvest, and rural markets. Avoid supermarket shelves unless the topic is retail/food sales.
- Every slide should be useful on its own: clear title, 3 to 5 specific bullets, and no placeholder text.

Return JSON with this exact shape:
{
  "title": "deck title",
  "subtitle": "short positioning line",
  "templateMood": "overview|startup|business|education|marketing|minimal|technology|agriculture|finance|creative",
  "visualKeywords": ["keyword"],
  "paletteHint": "blue|green|orange|purple|neutral|dark",
  "slides": [
    {
      "type": "cover|profile|definition|agenda|timeline|process|stats|impact|challenges|problem|solution|market|strategy|metrics|roadmap|comparison|quote|summary|thankyou",
      "title": "slide title",
      "subtitle": "optional subtitle",
      "bullets": ["3 to 5 useful bullet points"],
      "labels": ["optional chart or card labels — real topic-specific words, not placeholders"],
      "metric": "optional metric or number",
      "note": "optional speaker-style takeaway"
    }
  ]
}
For 3-slide decks, use this story arc: 1) compelling intro, 2) current landscape/applications/components with labeled visuals, 3) future/challenges/key takeaways. Never output unlabeled charts. Never use placeholder text like "Key", "focus area", "category", or "insight". Footer/title labels must match the topic exactly.
For 5-8 slide overview decks, prefer this professional magazine-style arc when it fits: cover, definition/profile, process/timeline, impact/stats, challenges, future/support, closing quote or key takeaways. Choose labels and card titles based on the topic.
Return exactly ${slideCount} slides.`,
    },
  ];
  const result = await callConfiguredModel(model, messages, { maxTokens: 2600, json: true });
  if (!result.ok) return result;
  try {
    const repaired = repairAiDeckPlan(parseAiJson(result.content), topic, slideCount, tone);
    const normalized = normalizeDeckPlan(repaired, topic, slideCount, tone);
    if (normalized.issues && normalized.issues.length) {
      console.groupCollapsed(`[Schema] ${normalized.issues.length} normalisation notices`);
      normalized.issues.forEach((issue) => console.warn(`  - ${issue}`));
      console.groupEnd();
    }
    if (!normalized.deck || !Array.isArray(normalized.deck.slides) || !normalized.deck.slides.length) throw new Error("Model returned no slides");
    // Attach strategy so buildGeneratedDeck can apply overrides
    if (strategy) normalized.deck._strategy = strategy;
    return { ok: true, deck: normalized.deck };
  } catch (error) {
    return { ok: false, error: error.message || "Invalid JSON response" };
  }
}

function buildGeneratedDeck(deck, topic, slideCount, tone, sourceLabel) {
  return buildDeckPages(deck, topic, slideCount, tone);
}

function buildDeckPages(deck, topic, slideCount, tone) {
  const title = cleanAiText(deck.title || titleCase(topic), 72) || titleCase(topic);
  const theme = chooseAiDeckTheme(deck, topic, tone);
  theme.footerLabel = shortDeckLabel(title, topic);
  // If deck carries strategy overrides from Step 1 reasoning, apply them
  if (deck._strategy) {
    const s = deck._strategy;
    if (s.templateFamily) theme.family = s.templateFamily;
    if (s.primaryAccentColor) {
      // inject accent override into palette
      theme.palette = [theme.palette[0], theme.palette[1], s.primaryAccentColor, theme.palette[3]];
    }
  }
  // Brand kit overrides — locked palette replaces the theme palette so
  // generated slides come out already branded.
  const brand = state.brandKit || defaultBrandKit();
  if (brand.colorLockEnabled) {
    const overrides = brandThemeOverrides(brand);
    theme.palette = overrides.palette;
    theme.dark = overrides.dark;
    theme.muted = overrides.muted;
  }
  const slides = normalizeAiSlides(deck, title, slideCount, topic);
  const pages = slides.map((slide, index) => makeAiPlanSlide(slide, index, slides.length, theme, deck));
  if (brand.fontLockEnabled) restyleDeckFonts(pages, brand);
  if (brand.logo) placeBrandLogos(pages, brand);
  return { title, pages };
}

function stageAiDeck(deck, topic, slideCount, tone) {
  const built = buildDeckPages(deck, topic, slideCount, tone);
  state.projectName = built.title;
  state.pages = built.pages;
  state.pageIndex = 0;
  state.selectedId = null;
  state.selectedIds = [];
  state.tool = "ppt";
  render();
  enhanceDeckWithPhotos(built.pages, deck, topic);
  return built;
}

// ── Auto topic photos — replaces generic stock images in generated decks
//    with live /api/photo-search results driven by the deck's visual keywords ──
let deckPhotoEnhanceSeq = 0;

async function enhanceDeckWithPhotos(pages, deck, topic = "") {
  if (state.aiAutoPhotos === false || !Array.isArray(pages) || !pages.length) return;
  const seq = ++deckPhotoEnhanceSeq;
  const keywords = [...new Set([...(deck?.visualKeywords || []), topic].filter(Boolean).slice(0, 4))];
  if (!keywords.length) return;
  const pool = [];
  for (const keyword of keywords) {
    try {
      const res = await fetch(`/api/photo-search?q=${encodeURIComponent(String(keyword).slice(0, 40))}&per=8`);
      const data = await res.json().catch(() => ({}));
      if (data?.ok && Array.isArray(data.photos)) pool.push(...data.photos.map((photo) => photo.url).filter(Boolean));
    } catch {}
    if (seq !== deckPhotoEnhanceSeq) return; // a newer enhancement superseded this one
  }
  const uniquePool = [...new Set(pool)];
  if (!uniquePool.length) return;
  const stockPrefix = "https://images.unsplash.com/photo-";
  let replaced = 0;
  pages.forEach((page, pageIndex) => {
    page.elements.forEach((el, elementIndex) => {
      if (el.type !== "image" || typeof el.src !== "string") return;
      if (!el.src.startsWith(stockPrefix)) return; // only swap topic-agnostic stock photos
      el.src = uniquePool[(pageIndex * 7 + elementIndex * 3) % uniquePool.length];
      replaced += 1;
    });
  });
  if (replaced) {
    if (state.collabEnabled) pushCollabState();
    render();
    console.log(`[Photos] Replaced ${replaced} stock images with topic-matched photos (${uniquePool.length} in pool)`);
  }
}

function normalizeAiSlides(deck, title, slideCount, topic = "") {
  const allowNumbers = /\d/.test(topic);
  const slides = deck.slides.slice(0, slideCount).map((slide) => {
    const detail = typeof normalizeSlideDetail === "function" ? normalizeSlideDetail(slide._detail || {}) : {};
    return {
      type: slide.type || "content",
      title: cleanAiText(detail.title || slide.title || title, 82) || "Untitled slide",
      subtitle: cleanAiText(slide.subtitle || slide.note || detail.subtitle || "", 150),
      bullets: Array.isArray(slide.bullets) ? slide.bullets.map((item) => cleanAiText(softenUnsupportedStats(item, allowNumbers), 145)).filter(Boolean).slice(0, 5) : [],
      labels: normalizeSlideLabels(slide, topic),
      metric: cleanAiText(allowNumbers ? slide.metric || "" : removeUnsupportedMetric(slide.metric || ""), 28),
      note: cleanAiText(softenUnsupportedStats(slide.note || "", allowNumbers), 160),
      kicker: cleanAiText(detail.kicker || slide.kicker || "", 44),
      statCards: detail.statCards || [],
      quote: detail.quote || null,
      chart: detail.chart || null,
      chips: detail.chips || [],
      highlight: cleanAiText(detail.highlight || "", 70),
      speakerNote: cleanAiText(softenUnsupportedStats(detail.speakerNote || "", allowNumbers), 180),
    };
  });
  if (!slides.some((slide) => slide.type === "cover")) slides.unshift({ type: "cover", title, subtitle: deck.subtitle || "AI generated presentation", bullets: [], metric: "", note: "" });
  while (slides.length < slideCount) slides.push({ type: "summary", title: "Key Takeaways", subtitle: "", bullets: ["Focus the core message", "Prioritize execution milestones", "Track measurable outcomes"], metric: "", note: "" });
  return slides.slice(0, slideCount);
}

function repairAiDeckPlan(deck, topic, slideCount, tone) {
  const repaired = deck && typeof deck === "object" ? { ...deck } : makeLocalDeckPlan(topic, slideCount, tone);
  if (!Array.isArray(repaired.slides)) repaired.slides = [];
  if (isRoboticsTopic(topic) && slideCount <= 3) return enforceRoboticsMiniDeck(repaired, slideCount);
  if (isBroadOverviewTopic(topic) && looksLikeProductPitchDeck(repaired)) return makeLocalDeckPlan(topic, slideCount, tone);
  if (isBroadOverviewTopic(topic)) {
    repaired.templateMood = repaired.templateMood || inferTopicMood(topic);
    repaired.title = topicOverviewTitle(topic, repaired.title);
    repaired.subtitle = repaired.subtitle || topicOverviewSubtitle(topic);
  }
  return repaired;
}

// ── Randomised local fallback — picks one of several arc variants so each
//    generation looks different even without an AI model connected ──────────
function makeLocalDeckPlan(topic, slideCount, tone) {
  if (isRoboticsTopic(topic)) return makeRoboticsDeck(slideCount);
  if (isBroadOverviewTopic(topic)) return makeTopicShowcaseDeck(topic, slideCount);
  const title = titleCase(topic);
  const seed = Date.now() % 5;   // 0-4, changes every ms → different each run

  // 5 distinct arc variants — picked by seed
  const arcVariants = [
    // Arc 0: Classic problem-solution
    [
      { type: "cover",      title,                             subtitle: `The complete guide to ${title}`, bullets: [] },
      { type: "definition", title: `What is ${title}?`,       subtitle: "Core concept and context", bullets: [`${title} is fundamentally about understanding the core need`, "It connects people, systems, and outcomes in a meaningful way", "Its value is measured by real-world impact and adoption"] },
      { type: "problem",    title: "The Challenge Today",     bullets: ["Existing approaches leave key gaps", "Users face friction at every step", "Costs and complexity are rising"] },
      { type: "solution",   title: "A Better Way Forward",    bullets: ["Simplify the core experience", "Focus on the highest-value use case", "Measure progress with clear signals"] },
      { type: "impact",     title: "Impact & Results",        labels: ["Efficiency", "Cost", "Quality", "Reach"], bullets: ["Faster outcomes with less effort", "Reduced operational overhead", "Higher quality at every stage", "Broader access for more people"] },
      { type: "roadmap",    title: "The Path Ahead",          bullets: ["Phase 1: Foundation", "Phase 2: Growth", "Phase 3: Scale", "Phase 4: Lead"] },
      { type: "challenges", title: "Key Challenges",          labels: ["Adoption", "Cost", "Complexity", "Competition"], bullets: ["Getting people to change habits", "Keeping costs sustainable", "Managing growing complexity", "Standing out in a crowded space"] },
      { type: "summary",    title: "Key Takeaways",           bullets: ["The need is real and growing", "The solution must be simple and measurable", "Execution is everything"] },
    ],
    // Arc 1: Educational magazine style
    [
      { type: "cover",      title,                             subtitle: `Understanding ${title} — a visual overview`, bullets: [] },
      { type: "profile",    title: `${title}: At a Glance`,   subtitle: "What it is and why it matters", bullets: [`${title} plays a central role in how we live and work today`, "It shapes decisions, behaviours, and outcomes at scale", "Understanding it deeply leads to better choices"] },
      { type: "timeline",   title: "How It Evolved",          labels: ["Origins", "Early Growth", "Mainstream", "Today", "Next"], bullets: ["The idea started from a simple real need", "Early adopters proved the concept at small scale", "Mainstream adoption brought new demands", "Today it is embedded in daily life", "The next chapter is already beginning"] },
      { type: "stats",      title: "Why It Matters Now",      labels: ["People", "Systems", "Economy", "Future"], bullets: ["Millions rely on it every day", "It connects and enables critical infrastructure", "Its economic footprint is substantial and growing", "Future versions will be transformative"] },
      { type: "challenges", title: "What Holds It Back",      labels: ["Access", "Cost", "Quality", "Awareness", "Trust", "Policy"], bullets: ["Not everyone can access it equally", "Affordability remains a barrier", "Quality varies widely", "Many people lack clear information", "Trust takes time to build", "Regulation is still catching up"] },
      { type: "solution",   title: "What Needs to Change",    bullets: ["Design for the underserved", "Make quality the baseline, not the premium", "Invest in education and awareness"] },
      { type: "quote",      title: `The Future of ${title}`,  subtitle: `"${title} will define the next generation of progress."`, note: "The question is not whether — it is how fast and how well.", bullets: [] },
      { type: "summary",    title: "Remember These",          bullets: [`${title} is a force multiplier for progress`, "Every barrier removed multiplies value", "The best investment is understanding it deeply"] },
    ],
    // Arc 2: Startup pitch / bold
    [
      { type: "cover",      title: `${title}: The Future Is Now`, subtitle: "A bold look at what's possible", bullets: [] },
      { type: "problem",    title: "The Problem Is Real",     bullets: ["The status quo is broken in a specific, measurable way", "Current solutions are slow, expensive, or inaccessible", "The cost of inaction is growing every year"] },
      { type: "solution",   title: `${title} Changes Everything`, bullets: ["It addresses the root cause, not the symptom", "It is faster, cheaper, and more accessible than alternatives", "Early results prove the model works"] },
      { type: "market",     title: "The Opportunity",         labels: ["Today", "Near Term", "Full Potential"], bullets: ["The immediate market is large and underserved", "Near-term tailwinds accelerate growth", "Full potential is transformative at scale"] },
      { type: "strategy",   title: "How We Win",              bullets: ["Start where the pain is greatest", "Build trust before scale", "Expand the playbook once the model is proven"] },
      { type: "metrics",    title: "Traction & Proof Points", bullets: ["Early adopters show strong retention", "Unit economics improve with each iteration", "Word-of-mouth drives organic growth"], metric: "Growing" },
      { type: "roadmap",    title: "12-Month Roadmap",        bullets: ["Q1: Validate core loop", "Q2: First 1000 users", "Q3: Monetise", "Q4: Series A ready"] },
      { type: "summary",    title: "The Ask Is Simple",       bullets: ["Join us at the beginning of something big", "The timing is right and the team is ready", "Let's build this together"] },
    ],
    // Arc 3: Data / analytics focus
    [
      { type: "cover",      title: `${title} — Data & Insights`, subtitle: "What the numbers actually tell us", bullets: [] },
      { type: "definition", title: `Defining ${title}`,       bullets: ["A clear definition avoids misunderstanding", "The scope includes both obvious and hidden dimensions", "Measurement matters before improvement is possible"] },
      { type: "stats",      title: "Current State of Play",   labels: ["Usage", "Growth", "Gaps", "Risk"], bullets: ["Usage is higher than most people assume", "Growth is accelerating in key segments", "Gaps in access and quality are measurable", "Risk grows when gaps go unaddressed"] },
      { type: "comparison", title: "Before vs After",         bullets: ["Without ${title}: slower, costlier, less reliable", "With ${title}: faster decisions, lower friction, better outcomes", "The difference compounds over time"] },
      { type: "impact",     title: "Real-World Impact",       labels: ["Individuals", "Organisations", "Communities", "Systems"], bullets: ["Individuals gain time and agency", "Organisations reduce cost and error", "Communities become more connected and resilient", "Systems operate more efficiently at every layer"] },
      { type: "challenges", title: "Where the Data Shows Gaps", labels: ["Data Quality", "Access", "Skills", "Speed"], bullets: ["Data quality limits decision confidence", "Access is uneven across demographics", "Skills to use insights are unevenly distributed", "Speed of insight lags speed of change"] },
      { type: "roadmap",    title: "From Insight to Action",  bullets: ["Collect better data at the source", "Make analysis accessible to non-experts", "Close the loop from insight to decision"] },
      { type: "summary",    title: "Three Numbers to Remember", bullets: ["1: Start with one clear metric that matters most", "10x: The multiplier when data drives decisions well", "0: The acceptable number of ignored insights"] },
    ],
    // Arc 4: Storytelling / human-centred
    [
      { type: "cover",      title: `The Story of ${title}`,   subtitle: "From origin to impact — a human story", bullets: [] },
      { type: "profile",    title: "Who This Is Really For",  subtitle: "The people at the centre of the story", bullets: ["Real people with real needs drive every important decision", "Their context, constraints, and goals must be understood first", "Designing without this leads to solutions nobody uses"] },
      { type: "timeline",   title: "How We Got Here",         labels: ["Need", "Idea", "Test", "Learn", "Grow"], bullets: ["A real problem existed long before the solution", "The first idea was imperfect but pointed in the right direction", "Testing with real users revealed what actually mattered", "Each failure made the next version better", "Growth followed genuine value, not just marketing"] },
      { type: "solution",   title: "What We Built",           bullets: ["A solution shaped by listening, not assumptions", "Simple enough that anyone can use it on day one", "Flexible enough to grow with the people it serves"] },
      { type: "impact",     title: "What Changed",            labels: ["Time", "Cost", "Confidence", "Connection"], bullets: ["People get hours back every week", "The financial burden is meaningfully reduced", "Confidence replaces uncertainty at key decision points", "People feel more connected to what matters"] },
      { type: "challenges", title: "What We're Still Solving", labels: ["Scale", "Trust", "Cost", "Reach"], bullets: ["Reaching more people without losing quality", "Building trust in new communities takes time", "Cost must come down to reach everyone", "Geographic and digital divides remain real"] },
      { type: "quote",      title: "A Voice From the Field",  subtitle: `"${title} gave us something we didn't know we were missing."`, note: "The most powerful proof is a changed life, not a metric on a slide.", bullets: [] },
      { type: "summary",    title: "The Story Continues",     bullets: ["The best chapter is still ahead", "Every new user adds to the proof that this matters", "Come be part of what happens next"] },
    ],
  ];

  const chosenArc = arcVariants[seed % arcVariants.length];

  return {
    title,
    subtitle: `${tone} presentation generated from your prompt`,
    templateMood: inferTopicMood(topic),
    visualKeywords: topicVisualKeywords(topic),
    paletteHint: inferPaletteHint(topic),
    slides: chosenArc.slice(0, Math.max(slideCount, 3)),
  };
}

function makeTopicShowcaseDeck(topic, slideCount) {
  const profile = topicShowcaseProfile(topic);
  const slides = [
    { type: "cover", title: profile.title, subtitle: profile.subtitle, note: profile.kicker, bullets: [] },
    { type: "profile", title: `Who Is ${profile.articleTitle}?`, subtitle: profile.profileSubtitle, bullets: profile.definitionBullets, labels: profile.roleLabels },
    { type: "timeline", title: profile.timelineTitle, labels: profile.timelineLabels, bullets: profile.timelineBullets },
    { type: "stats", title: `Why ${profile.pluralTitle} Matter`, labels: profile.impactLabels, bullets: profile.impactBullets, metric: "Impact" },
    { type: "challenges", title: `Challenges Faced by ${profile.pluralTitle}`, labels: profile.challengeLabels, bullets: profile.challengeBullets },
    { type: "quote", title: profile.closingTitle, subtitle: profile.closingQuote, note: profile.closingNote, bullets: [] },
    { type: "solution", title: `How We Can Support ${profile.pluralTitle}`, bullets: profile.supportBullets },
    { type: "roadmap", title: `${profile.subjectTitle}: The Way Forward`, bullets: profile.futureBullets },
  ];
  return {
    title: profile.title,
    subtitle: profile.subtitle,
    templateMood: profile.mood,
    visualKeywords: profile.visualKeywords,
    paletteHint: profile.paletteHint,
    slides: slides.slice(0, slideCount),
  };
}

function makeFarmerOverviewDeck(slideCount) {
  return makeTopicShowcaseDeck("farmer", slideCount);
}

function makeGeneralOverviewDeck(topic, slideCount) {
  const title = topicOverviewTitle(topic);
  const subject = titleCase(topic);
  const slides = [
    { type: "cover", title, subtitle: `A clear overview of ${subject.toLowerCase()}`, bullets: [] },
    { type: "agenda", title: "What We'll Cover", bullets: [`What ${subject.toLowerCase()} means`, "Why it matters", "Main challenges", "Practical approaches", "Future opportunities"] },
    { type: "summary", title: `Understanding ${subject}`, bullets: [`Define ${subject.toLowerCase()} in simple terms`, "Show where it appears in everyday life", "Explain who is affected", "Connect the topic to real outcomes"] },
    { type: "problem", title: "Key Challenges", bullets: ["Access and affordability", "Quality and reliability", "Awareness and adoption", "Long-term sustainability"] },
    { type: "solution", title: "Practical Solutions", bullets: ["Use local context to choose the right approach", "Make the process simple for users", "Measure progress with clear indicators", "Improve through feedback"] },
    { type: "roadmap", title: "Way Forward", bullets: ["Understand needs", "Plan actions", "Implement carefully", "Review outcomes", "Scale what works"] },
    { type: "summary", title: "Key Takeaways", bullets: [`${subject} matters when it improves real lives`, "Good decisions need context and evidence", "Sustainable progress depends on consistent execution"] },
  ];
  return {
    title,
    subtitle: `A clear overview of ${subject.toLowerCase()}`,
    templateMood: inferTopicMood(topic),
    visualKeywords: topicVisualKeywords(topic),
    paletteHint: inferPaletteHint(topic),
    slides: slides.slice(0, slideCount),
  };
}

function topicShowcaseProfile(topic) {
  const subject = titleCase(String(topic || "topic").replace(/:.*/, "").trim() || "Topic");
  if (isFarmerTopic(subject)) {
    return {
      subjectTitle: "Farmer",
      articleTitle: "a Farmer",
      pluralTitle: "Farmers",
      title: "The Farmer",
      subtitle: "Feeding the world, one harvest at a time",
      kicker: "Backbone of society",
      profileSubtitle: "A guardian of the earth",
      mood: "agriculture",
      paletteHint: "green",
      visualKeywords: ["farmer", "field", "crop", "soil", "harvest"],
      roleLabels: ["Crop Grower", "Land Manager", "Conservationist"],
      roleSubtexts: ["Plants and harvests food crops", "Maintains soil, tools, and machinery", "Protects land and biodiversity"],
      definitionBullets: ["A farmer cultivates land, raises crops, and cares for livestock to provide food and agricultural products.", "Farmers are primary producers who support families, markets, and local communities.", "Their work combines soil knowledge, weather judgment, water use, tools, and market decisions."],
      timelineTitle: "A Day in the Life of a Farmer",
      timelineLabels: ["4:30 AM", "6:00 AM", "8:00 AM", "12:00 PM", "3:00 PM", "7:00 PM"],
      timelineBullets: ["Feed animals and check water", "Inspect fields and irrigation", "Prepare soil or harvest produce", "Maintain tools and storage", "Sell produce and coordinate transport", "Plan next day and review weather"],
      impactLabels: ["Food Security", "Rural Jobs", "Land Care", "Local Economy"],
      impactBullets: ["Keeps communities supplied with essential food", "Supports livelihoods across villages and towns", "Protects soil, biodiversity, and water", "Strengthens markets and family incomes"],
      challengeLabels: ["Climate Change", "Financial Stress", "Land Degradation", "Water Scarcity", "Market Access", "Technology Gap"],
      challengeBullets: ["Unpredictable weather affects crop planning", "Input costs and unstable prices squeeze income", "Soil erosion reduces productivity", "Water shortages make irrigation difficult", "Storage and transport limit fair pricing", "Tools must be affordable and locally useful"],
      supportBullets: ["Improve access to fair markets and storage", "Promote soil health and water-efficient methods", "Make advisory tools local and affordable", "Recognize farming as skilled essential work"],
      futureBullets: ["Healthy soil", "Smart water use", "Crop diversity", "Local markets", "Farmer-first technology"],
      closingTitle: "Honour the Farmer",
      closingQuote: "Every meal on our table is a testament to a farmer's sacrifice.",
      closingNote: "Let us support, respect, and celebrate the hands that feed the world.",
    };
  }
  return {
    subjectTitle: subject,
    articleTitle: /^[aeiou]/i.test(subject) ? `an ${subject}` : `a ${subject}`,
    pluralTitle: subject.endsWith("s") ? subject : `${subject}s`,
    title: `${subject}: Overview and Impact`,
    subtitle: `A clear, elegant introduction to ${subject.toLowerCase()}`,
    kicker: "Essential context",
    profileSubtitle: "A clear definition",
    mood: inferTopicMood(subject),
    paletteHint: inferPaletteHint(subject),
    visualKeywords: topicVisualKeywords(subject),
    roleLabels: ["Core Role", "Key Skills", "Impact Area"],
    roleSubtexts: ["What it does", "What it needs", "Where it matters"],
    definitionBullets: [`${subject} can be understood through its purpose, users, and real-world context.`, "A strong overview explains what it is, why it matters, and how it affects people.", "The topic becomes clearer when broken into roles, process, impact, and challenges."],
    timelineTitle: `${subject}: How It Works`,
    timelineLabels: ["Discover", "Prepare", "Act", "Monitor", "Improve", "Scale"],
    timelineBullets: ["Understand the need and context", "Gather resources and plan the work", "Execute the core activity", "Track progress and quality", "Improve based on feedback", "Expand what works"],
    impactLabels: ["People", "Systems", "Economy", "Future"],
    impactBullets: ["Improves daily life and decisions", "Strengthens processes and reliability", "Creates value and opportunity", "Shapes long-term progress"],
    challengeLabels: ["Access", "Cost", "Quality", "Awareness", "Adoption", "Sustainability"],
    challengeBullets: ["Not everyone can access it equally", "Resources and affordability matter", "Quality varies across contexts", "People need clear information", "Adoption requires trust and training", "Long-term outcomes need care"],
    supportBullets: ["Improve access and affordability", "Design around real user needs", "Measure outcomes clearly", "Keep improving through feedback"],
    futureBullets: ["Understand needs", "Improve systems", "Build trust", "Measure outcomes", "Scale responsibly"],
    closingTitle: `${subject}: Key Message`,
    closingQuote: `${subject} matters most when it creates practical value for people.`,
    closingNote: "The best presentations make the topic clear, relevant, and memorable.",
  };
}

function isBroadOverviewTopic(topic) {
  const textValue = String(topic || "").trim().toLowerCase();
  const words = textValue.split(/\s+/).filter((word) => word && !["a", "an", "the", "about", "on"].includes(word));
  if (!words.length || words.length > 3) return false;
  return !/\b(pitch|startup|investor|product|app|platform|saas|software|business plan|go-to-market|marketing plan|proposal|case study|report|strategy for|launch)\b/.test(textValue);
}

function looksLikeProductPitchDeck(deck) {
  const combined = JSON.stringify(deck).toLowerCase();
  const productSignals = (combined.match(/\b(operating system|platform|saas|api|dashboard|sensor|subscription|vendor lock|go-to-market|market size|seed round|investor|product launch|app)\b/g) || []).length;
  const unsupportedStats = (combined.match(/[$₹€£]\s?\d|\b\d+(\.\d+)?\s?(%|k|m|b|t|million|billion|trillion|crore|lakh)\b/g) || []).length;
  return productSignals >= 2 || unsupportedStats >= 2;
}

function isFarmerTopic(topic) {
  return /\b(farmer|farmers|farming|agriculture|agricultural|kisan|crop|crops)\b/i.test(String(topic || ""));
}

function isRoboticsTopic(topic) {
  return /\b(robot|robots|robotic|robotics|cobot|cobots|automation)\b/i.test(String(topic || ""));
}

function makeRoboticsDeck(slideCount) {
  const slides = [
    { type: "cover", title: "Robotics: Machines That Sense, Think, and Act", subtitle: "How intelligent machines combine mechanics, electronics, and AI to solve real-world tasks", bullets: [] },
    { type: "market", title: "Where Robotics Is Used Today", subtitle: "Robotics is moving from factory floors into everyday operations", labels: ["Industrial", "Medical", "Service", "Logistics", "Agriculture"], bullets: ["Industrial robots handle repetitive precision work", "Medical robots support surgery, rehab, and care workflows", "Service robots assist in cleaning, delivery, and customer operations", "Logistics robots move goods through warehouses and supply chains"], metric: "Use cases" },
    { type: "roadmap", title: "The Path Forward", subtitle: "Future robotics will focus on safer, smarter collaboration with humans", bullets: ["Collaborative robots augment human work instead of replacing it", "Edge AI enables faster decisions close to the machine", "Soft robotics improves safety around people and delicate objects", "Ethics, safety standards, and workforce training remain essential"] },
    { type: "summary", title: "Key Takeaways", bullets: ["Robotics brings together sensing, movement, control, and intelligence", "The strongest use cases solve repetitive, risky, or precision-heavy tasks", "Human-centered design will decide adoption and trust"] },
  ];
  return {
    title: "Robotics: Machines That Sense, Think, and Act",
    subtitle: "A concise overview of applications, impact, and future direction",
    templateMood: "technology",
    visualKeywords: ["robotics", "automation", "AI", "cobots", "sensors"],
    paletteHint: "dark",
    slides: slides.slice(0, slideCount),
  };
}

function enforceRoboticsMiniDeck(deck, slideCount) {
  const base = makeRoboticsDeck(Math.max(3, slideCount));
  const existingFuture = deck.slides.find((slide) => /future|forward|trend|takeaway|ethic|path/i.test(`${slide.title || ""} ${slide.note || ""}`));
  if (existingFuture?.bullets?.length) base.slides[2].bullets = existingFuture.bullets.slice(0, 4);
  return {
    ...base,
    title: cleanAiText(deck.title || base.title, 72) || base.title,
    subtitle: cleanAiText(deck.subtitle || base.subtitle, 150) || base.subtitle,
    slides: base.slides.slice(0, slideCount),
  };
}

function topicOverviewTitle(topic, fallback = "") {
  if (isRoboticsTopic(topic)) return "Robotics: Machines That Sense, Think, and Act";
  if (isFarmerTopic(topic)) return "Farmers: Backbone of Food Security";
  const clean = titleCase(topic || fallback || "Presentation");
  return clean.includes(":") ? clean : `${clean}: Overview and Impact`;
}

function topicOverviewSubtitle(topic) {
  if (isRoboticsTopic(topic)) return "Applications, components, challenges, and future direction";
  if (isFarmerTopic(topic)) return "Role, challenges, modern practices, and future opportunities";
  return `A clear overview of ${String(topic || "the topic").toLowerCase()}`;
}

function inferTopicMood(topic) {
  const value = String(topic || "").toLowerCase();
  if (isRoboticsTopic(value)) return "technology";
  if (isFarmerTopic(value)) return "agriculture";
  if (/\b(ai|robot|tech|software|app|automation|data|computer|digital|cyber)\b/.test(value)) return "technology";
  if (/\b(electric|ev|vehicle|car|auto|transport|motor|battery|tesla)\b/.test(value)) return "technology";
  if (/\b(climate|solar|wind|energy|environment|green|renewable|sustainable)\b/.test(value)) return "green-energy";
  if (/\b(finance|money|revenue|sales|market|invest|stock|bank|economy)\b/.test(value)) return "finance";
  if (/\b(lesson|school|student|teacher|education|learn|university|college)\b/.test(value)) return "education";
  if (/\b(health|medical|hospital|doctor|medicine|drug|pharma|nurse)\b/.test(value)) return "health";
  if (/\b(space|nasa|galaxy|planet|cosmos|satellite|rocket|astronomy)\b/.test(value)) return "space";
  if (/\b(food|restaurant|recipe|nutrition|cuisine|chef|cooking)\b/.test(value)) return "food";
  if (/\b(sport|fitness|yoga|exercise|athlete|game|football|cricket|basketball)\b/.test(value)) return "sports";
  return "overview";
}

function inferPaletteHint(topic) {
  const mood = inferTopicMood(topic);
  if (mood === "agriculture") return "green";
  if (mood === "technology") return "blue";
  if (mood === "green-energy") return "green";
  if (mood === "finance") return "purple";
  if (mood === "health") return "blue";
  if (mood === "space") return "dark";
  if (mood === "food") return "orange";
  if (mood === "sports") return "orange";
  return "blue";
}

function topicVisualKeywords(topic) {
  if (isRoboticsTopic(topic)) return ["robotics", "automation", "AI", "sensors", "cobots"];
  if (isFarmerTopic(topic)) return ["farmer", "field", "crop", "soil", "irrigation", "harvest"];
  return String(topic || "").split(/\s+/).filter(Boolean).slice(0, 5);
}

function cleanAiText(value, maxLength = 140) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\bundefined\b|\bnull\b/gi, "")
    .trim()
    .slice(0, maxLength);
}

function softenUnsupportedStats(value, allowNumbers) {
  const textValue = String(value || "");
  if (allowNumbers) return textValue;
  return textValue
    .replace(/[$₹€£]\s?\d[\w.,]*/g, "large")
    .replace(/\b\d+(\.\d+)?\s?(%|k|m|b|t|million|billion|trillion|crore|lakh)\b/gi, "many")
    .replace(/\b20\d{2}\b/g, "recent years");
}

function removeUnsupportedMetric(value) {
  const textValue = String(value || "");
  if (/[$₹€£]\s?\d|\b\d+(\.\d+)?\s?(%|k|m|b|t|million|billion|trillion|crore|lakh)\b/i.test(textValue)) return "";
  return textValue;
}

function normalizeSlideLabels(slide, topic) {
  const source = Array.isArray(slide.labels) ? slide.labels : Array.isArray(slide.categories) ? slide.categories : [];
  const labels = source.map((item) => cleanAiText(item, 18)).filter(Boolean).slice(0, 5);
  if (labels.length) return labels;
  if (isRoboticsTopic(topic) && /market|metric|landscape|application|use/i.test(`${slide.type || ""} ${slide.title || ""}`)) {
    return ["Industrial", "Medical", "Service", "Logistics", "Agriculture"];
  }
  if (isFarmerTopic(topic) && /market|metric|landscape|application|use/i.test(`${slide.type || ""} ${slide.title || ""}`)) {
    return ["Soil", "Water", "Seeds", "Harvest", "Market"];
  }
  return [];
}

function shortDeckLabel(title, topic) {
  if (isRoboticsTopic(topic || title)) return "Robotics";
  if (isFarmerTopic(topic || title)) return "Farmers";
  const clean = cleanAiText(title || topic || "Presentation", 28).replace(/:.*/, "").trim();
  return clean || "Presentation";
}

function aiText(x, y, w, h, value, fontSize, fontWeight, color, lineHeight = 1.16) {
  const el = text(x, y, w, h, value, fontSize, fontWeight, color);
  el.lineHeight = lineHeight;
  return el;
}

function aiTitleText(x, y, w, value, color, baseSize = 40) {
  const clean = cleanAiText(value, 88);
  const size = clean.length > 70 ? Math.max(27, baseSize - 12) : clean.length > 54 ? Math.max(30, baseSize - 8) : clean.length > 38 ? Math.max(34, baseSize - 4) : baseSize;
  const height = clean.length > 62 ? 104 : clean.length > 42 ? 82 : 58;
  const el = aiText(x, y, w, height, clean, size, 900, color, 1.08);
  el.fontFamily = "Montserrat";  // Display font for all AI-generated titles
  return el;
}

// ── Polygon shape helper for AI slides (uses existing shapeAsset system) ──
// shapeId must match an id in makeShapeAssets() — e.g. "parallelogram-1", "triangle-1", "diamond-1"
function poly(shapeId, x, y, w, h, fill, opacity = 1) {
  return { id: crypto.randomUUID(), type: "shapeAsset", shapeId, x, y, w, h, fill, opacity };
}

// ── Inline icon element for AI slides ──
// code = unicode codepoint string e.g. "26A1" for ⚡
function aiIcon(x, y, size, code, color, opacity = 0.15) {
  return { id: crypto.randomUUID(), type: "icon", x, y, w: size, h: size, code, fontSize: Math.round(size * 0.78), color, opacity };
}

// ── Topic → decorative background icon ──
function topicDecorIcon(topic) {
  const h = String(topic || "").toLowerCase();
  if (/electric|ev|car|vehicle|auto|motor|tesla/.test(h))            return ["1F697", "#4fc3f7"]; // 🚗
  if (/agri|farm|crop|soil|harvest|kisan/.test(h))                   return ["1F33F", "#66bb6a"]; // 🌿
  if (/robot|ai|tech|software|automation|digital|cyber/.test(h))     return ["1F916", "#42a5f5"]; // 🤖
  if (/climate|solar|wind|energy|green|renewable/.test(h))           return ["2600", "#ffd54f"];  // ☀️
  if (/health|medical|hospital|doctor|medicine|pharma/.test(h))      return ["1F489", "#ef5350"]; // 💉
  if (/education|school|student|teacher|learn|university/.test(h))   return ["1F393", "#ab47bc"]; // 🎓
  if (/space|galaxy|planet|cosmos|rocket|astronomy/.test(h))         return ["1F680", "#5c6bc0"]; // 🚀
  if (/food|restaurant|recipe|nutrition|cuisine/.test(h))            return ["1F35C", "#ff7043"]; // 🍜
  if (/sport|fitness|yoga|exercise|athlete|football|cricket/.test(h))return ["26BD", "#26a69a"];  // ⚽
  if (/finance|money|revenue|sales|market|invest|stock/.test(h))     return ["1F4B0", "#ffca28"]; // 💰
  if (/travel|tourism|destination|trip/.test(h))                     return ["2708", "#29b6f6"];  // ✈
  return ["2728", "#90caf9"]; // ✨ default
}

function aiSerifText(x, y, w, h, value, fontSize, fontWeight, color, lineHeight = 1.12) {
  const el = aiText(x, y, w, h, value, fontSize, fontWeight, color, lineHeight);
  el.fontFamily = "Georgia";
  return el;
}

function makeElegantShowcaseSlide(slide, index, total, theme, deck) {
  const profile = topicShowcaseProfile(deck.title || theme.footerLabel || "presentation");
  const [ink, paper, accent, pop] = theme.palette;
  const type = String(slide.type || "").toLowerCase();
  const page = makeBlankPage(slide.title || `Slide ${index + 1}`);
  const photo = theme.photos?.[index % theme.photos.length] || theme.photo;
  const accentLight = accent + "33"; // 20% opacity version for backgrounds

  // ── COVER ── Canva-style: diagonal split, photo right, bold left panel + polygon shapes ──
  if (type === "cover") {
    page.background = ink;
    const titleText = slide.title || deck.title || profile.title;
    const subtitleText = slide.subtitle || deck.subtitle || profile.subtitle;
    const [iconCode, iconColor] = topicDecorIcon(deck.title || theme.footerLabel || "");
    page.elements = [
      // Full canvas base color
      shape("rect", 0, 0, 960, 540, ink, 1),
      // Photo fills right ~55% of slide
      image(420, 0, 540, 540, photo),
      // Parallelogram shape overlaps the photo/panel boundary — creates diagonal cut effect
      poly("parallelogram-1", 390, 0, 110, 540, ink, 1),
      // Left panel solid
      shape("rect", 0, 0, 420, 540, ink, 1),
      // Decorative diamond accent top-right of photo
      poly("diamond-1", 820, 20, 80, 80, pop, 0.55),
      // Chevron decorative bottom-left
      poly("chevron-1", -30, 430, 140, 60, accent, 0.22),
      // Decorative circle arcs
      shape("circle", 900, 460, 220, 220, pop, 0.14),
      shape("circle", -40, 490, 160, 160, accent, 0.1),
      // Top accent bar
      shape("rect", 0, 0, 460, 5, accent, 1),
      // Bottom accent bar
      shape("rect", 0, 535, 460, 5, accent, 1),
      // Left vertical accent line
      shape("rect", 0, 0, 5, 540, accent, 1),
      // Large faint decorative topic icon (watermark-style)
      aiIcon(300, 340, 160, iconCode, iconColor, 0.12),
      // Category label / brand
      aiText(36, 44, 380, 22, (theme.footerLabel || "PRESENTATION").toUpperCase(), 12, 900, accent, 1),
      // Bold main title — large, white, Montserrat
      aiTitleText(36, 100, 400, titleText, "#ffffff", 54),
      // Colored accent bar under title
      shape("rect", 36, 268, 220, 6, accent, 1),
      // Subtitle
      aiText(36, 288, 400, 68, subtitleText, 18, 500, "rgba(255,255,255,0.78)", 1.32),
      // Tagline / kicker pill using chevron/tag shape
      poly("tag-1", 36, 382, 210, 40, accent, 0.95),
      aiText(50, 392, 180, 20, (slide.note || profile.kicker || "Discover More").toUpperCase(), 12, 900, ink, 1),
      // Slide counter
      aiText(36, 514, 80, 18, `${index + 1} / ${total}`, 11, 700, "rgba(255,255,255,0.3)"),
    ];
    return page;
  }

  // ── QUOTE / SUMMARY / THANKYOU ── Dark cinematic
  if (["quote", "summary", "thankyou"].includes(type)) {
    page.background = ink;
    page.elements = [
      image(0, 0, 960, 540, photo),
      shape("rect", 0, 0, 960, 540, ink, 0.74),
      shape("circle", 720, 340, 320, 320, accent, 0.14),
      shape("rect", 0, 0, 6, 540, accent, 1),
      aiTitleText(100, 130, 760, slide.title || profile.closingTitle, "#ffffff", 44),
      shape("rect", 100, 228, 260, 5, accent, 1),
      aiText(104, 252, 700, 70, slide.subtitle || slide.note || profile.closingQuote, 22, 400, "rgba(255,255,255,0.78)", 1.35),
      aiText(874, 514, 48, 18, `${index + 1}/${total}`, 11, 700, "rgba(255,255,255,0.4)"),
    ];
    return page;
  }

  // ── STATS / IMPACT ── Dark bg with vibrant coloured metric cards
  if (["stats", "impact"].includes(type)) {
    page.background = "#0f172a";
    const labels = (slide.labels?.length ? slide.labels : profile.impactLabels).slice(0, 4);
    const bullets = (slide.bullets.length ? slide.bullets : profile.impactBullets).slice(0, 4);
    const cardColors = [accent, pop, "#f59e0b", "#10b981"];
    page.elements = [
      shape("rect", 0, 0, 960, 540, "#0f172a", 1),
      shape("circle", 830, -60, 260, 260, accent, 0.12),
      shape("circle", -60, 460, 220, 220, pop, 0.1),
      shape("rect", 0, 0, 6, 540, accent, 1),
      aiText(46, 42, 600, 20, (theme.footerLabel || "").toUpperCase(), 11, 800, accent),
      aiTitleText(46, 70, 860, slide.title, "#ffffff", 36),
      shape("rect", 46, 136, 200, 4, accent, 1),
    ];
    labels.forEach((label, itemIndex) => {
      const col = itemIndex % 2;
      const row = Math.floor(itemIndex / 2);
      const x = 46 + col * 450;
      const y = 174 + row * 148;
      const c = cardColors[itemIndex % cardColors.length];
      page.elements.push(shape("rect", x, y, 400, 118, c, 0.1));
      page.elements.push(shape("rect", x, y, 4, 118, c, 1));
      page.elements.push(aiText(x + 22, y + 18, 340, 30, label, 22, 900, "#ffffff"));
      page.elements.push(aiText(x + 22, y + 60, 360, 46, bullets[itemIndex] || "Measurable progress", 13, 500, "rgba(255,255,255,0.72)", 1.3));
    });
    page.elements.push(aiText(874, 514, 48, 18, `${index + 1}/${total}`, 11, 700, "rgba(255,255,255,0.4)"));
    return page;
  }

  // ── CHALLENGES ── Grid of vibrant cards on dark
  if (type === "challenges") {
    page.background = "#0f172a";
    const labels = (slide.labels?.length ? slide.labels : profile.challengeLabels).slice(0, 6);
    const bullets = (slide.bullets.length ? slide.bullets : profile.challengeBullets).slice(0, 6);
    const cardColors = [accent, "#f59e0b", pop, "#ef4444", "#10b981", "#8b5cf6"];
    page.elements = [
      shape("rect", 0, 0, 960, 540, "#0f172a", 1),
      shape("rect", 0, 0, 6, 540, accent, 1),
      aiText(46, 42, 600, 20, (theme.footerLabel || "").toUpperCase(), 11, 800, accent),
      aiTitleText(46, 70, 860, slide.title, "#ffffff", 36),
      shape("rect", 46, 136, 160, 4, accent, 1),
    ];
    labels.forEach((label, itemIndex) => {
      const col = itemIndex % 3;
      const row = Math.floor(itemIndex / 3);
      const x = 46 + col * 296;
      const y = 162 + row * 160;
      const c = cardColors[itemIndex % cardColors.length];
      page.elements.push(shape("rect", x, y, 268, 138, "#1e293b", 1));
      page.elements.push(shape("rect", x, y, 268, 4, c, 1));
      page.elements.push(aiText(x + 16, y + 22, 228, 22, label, 15, 900, "#ffffff"));
      page.elements.push(aiText(x + 16, y + 54, 236, 68, bullets[itemIndex] || "Key challenge area", 12, 500, "rgba(255,255,255,0.7)", 1.28));
    });
    page.elements.push(aiText(874, 514, 48, 18, `${index + 1}/${total}`, 11, 700, "rgba(255,255,255,0.4)"));
    return page;
  }

  // ── PROFILE / DEFINITION ── Split layout: text left, photo+cards right
  if (["profile", "definition"].includes(type)) {
    page.background = paper;
    const labels = (slide.labels?.length ? slide.labels : profile.roleLabels).slice(0, 3);
    page.elements = [
      shape("rect", 0, 0, 960, 540, paper, 1),
      shape("rect", 0, 0, 480, 540, ink, 1),
      image(0, 0, 480, 540, photo),
      shape("rect", 0, 0, 480, 540, ink, 0.52),
      shape("rect", 0, 0, 6, 540, accent, 1),
      aiText(36, 46, 380, 20, (theme.footerLabel || "").toUpperCase(), 11, 800, accent),
      aiTitleText(36, 90, 400, slide.title, "#ffffff", 38),
      shape("rect", 36, 176, 180, 5, accent, 1),
      aiText(36, 198, 400, 100, slide.subtitle || profile.profileSubtitle, 16, 400, "rgba(255,255,255,0.75)", 1.35),
    ];
    labels.forEach((label, labelIndex) => {
      const y = 86 + labelIndex * 136;
      page.elements.push(shape("rect", 510, y, 420, 110, "#f8fafc", 1));
      page.elements.push(shape("rect", 510, y, 4, 110, [accent, pop, "#f59e0b"][labelIndex % 3], 1));
      page.elements.push(aiText(528, y + 16, 320, 22, label, 16, 800, ink));
      page.elements.push(aiText(528, y + 50, 370, 46, profile.roleSubtexts[labelIndex] || "Core function of this topic", 13, 500, "#475569", 1.3));
    });
    page.elements.push(aiText(874, 514, 48, 18, `${index + 1}/${total}`, 11, 700, theme.muted));
    return page;
  }

  // ── TIMELINE / PROCESS ── Horizontal numbered steps
  if (["timeline", "process"].includes(type)) {
    page.background = paper;
    const labels = (slide.labels?.length ? slide.labels : profile.timelineLabels).slice(0, 6);
    const bullets = (slide.bullets.length ? slide.bullets : profile.timelineBullets).slice(0, 6);
    page.elements = [
      shape("rect", 0, 0, 960, 540, paper, 1),
      shape("rect", 0, 0, 960, 72, ink, 1),
      aiText(46, 22, 700, 32, slide.title || "", 24, 900, "#ffffff"),
      aiText(874, 514, 48, 18, `${index + 1}/${total}`, 11, 700, theme.muted),
    ];
    const cols = labels.length > 3 ? 2 : 1;
    const rows = Math.ceil(labels.length / (cols === 2 ? 2 : 1));
    labels.forEach((label, itemIndex) => {
      const col = cols === 2 ? itemIndex % 2 : 0;
      const row = cols === 2 ? Math.floor(itemIndex / 2) : itemIndex;
      const x = 46 + col * 450;
      const y = 96 + row * (rows > 3 ? 100 : 118);
      const stepColors = [accent, pop, "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];
      page.elements.push(shape("circle", x, y + 10, 34, 34, stepColors[itemIndex % stepColors.length], 1));
      page.elements.push(aiText(x + 11, y + 18, 20, 18, String(itemIndex + 1), 14, 900, "#ffffff"));
      page.elements.push(aiText(x + 52, y + 4, 360, 22, label, 15, 800, ink));
      page.elements.push(aiText(x + 52, y + 32, 360, 50, bullets[itemIndex] || "Key activity at this stage", 12, 500, "#475569", 1.28));
      if (col === 0 && cols === 2 && itemIndex + 1 < labels.length) {
        page.elements.push(shape("rect", x + 410, y + 24, 36, 2, stepColors[(itemIndex + 1) % stepColors.length], 0.5));
      }
    });
    return page;
  }

  // ── DEFAULT content slide ── Card layout with icon watermark
  page.background = paper;
  const bullets = (slide.bullets.length ? slide.bullets : [slide.subtitle || "Key point"]).slice(0, 4);
  const [iconCode2, iconColor2] = topicDecorIcon(deck.title || theme.footerLabel || "");
  page.elements = [
    shape("rect", 0, 0, 960, 540, paper, 1),
    // Header bar
    shape("rect", 0, 0, 960, 72, ink, 1),
    // Diamond accent in header
    poly("diamond-1", 900, -20, 90, 90, pop, 0.35),
    aiTitleText(46, 16, 820, slide.title || "", "#ffffff", 26),
    // Large watermark icon bottom-right (faint decorative)
    aiIcon(750, 270, 200, iconCode2, iconColor2, 0.08),
    // Photo panel right side
    image(620, 90, 300, 340, photo),
    shape("rect", 620, 90, 300, 340, ink, 0.18),
    // Metric tag using tag shape
    poly("tag-1", 618, 402, 210, 40, accent, 0.95),
    aiText(636, 412, 180, 20, slide.metric || (theme.footerLabel || ""), 12, 800, "#ffffff"),
    aiText(874, 514, 48, 18, `${index + 1}/${total}`, 11, 700, theme.muted),
  ];
  bullets.forEach((item, itemIndex) => {
    const y = 102 + itemIndex * 90;
    const barColor = [accent, pop, "#f59e0b", "#10b981"][itemIndex % 4];
    page.elements.push(shape("rect", 46, y, 540, 72, itemIndex % 2 ? "#f8fafc" : "#f1f5f9", 1));
    page.elements.push(shape("rect", 46, y, 4, 72, barColor, 1));
    // Small bullet icon per row
    page.elements.push(aiIcon(48, y + 22, 28, iconCode2, barColor, 0.55));
    page.elements.push(aiText(82, y + 12, 470, 48, item, item.length > 90 ? 14 : 17, 600, "#1e293b", 1.28));
  });
  return page;
}

function decorativeCropRow(x, y, count, color) {
  return Array.from({ length: count }, (_, index) => [
    shape("rect", x + index * 58 + 16, y + 38, 8, 86, "#704422", 1),
    shape("circle", x + index * 58, y, 36, 66, color, 0.9),
  ]).flat();
}

function makeTemplateFamilyAiSlide(slide, index, total, theme, deck) {
  const family = theme.family || "standard";
  if (family === "agriculture-photo") return makeAgricultureAiSlide(slide, index, total, theme, deck);
  if (family === "dark-tech") return makeDarkTechAiSlide(slide, index, total, theme, deck);
  if (family === "clean-business") return makeCleanBusinessAiSlide(slide, index, total, theme, deck);
  if (family === "editorial-split") return makeEditorialSplitAiSlide(slide, index, total, theme, deck);
  if (family === "showcase") return makeElegantShowcaseSlide(slide, index, total, theme, deck);
  return null;
}

function makeAgricultureAiSlide(slide, index, total, theme, deck) {
  const [ink, paper, accent, pop] = theme.palette;
  const photo = theme.photos?.[index % theme.photos.length] || theme.photo;
  const type = String(slide.type || "").toLowerCase();
  if (["cover", "profile", "definition", "timeline", "process", "stats", "impact", "challenges", "quote"].includes(type)) {
    return makeElegantShowcaseSlide(slide, index, total, theme, deck);
  }
  const page = makeBlankPage(slide.title || `Slide ${index + 1}`);
  page.background = paper;
  page.elements = [
    shape("rect", 0, 0, 960, 540, paper, 1),
    shape("rect", 0, 0, 960, 16, accent, 1),
    shape("circle", 790, -110, 260, 260, accent, 0.12),
    aiText(56, 502, 350, 18, theme.footerLabel || theme.templateName || "Agriculture", 11, 750, theme.muted),
    aiText(854, 502, 48, 18, `${index + 1}/${total}`, 12, 800, theme.muted),
  ];
  if (type === "cover") {
    page.elements.push(image(520, 16, 440, 524, photo));
    page.elements.push(shape("rect", 520, 16, 440, 524, ink, 0.18));
    page.elements.push(aiTitleText(62, 105, 430, slide.title || deck.title, ink, 50));
    page.elements.push(aiText(66, 245, 380, 82, slide.subtitle || deck.subtitle || "Agriculture overview", 23, 650, "#334155"));
    page.elements.push(shape("rect", 66, 360, 230, 11, accent));
    page.elements.push(shape("circle", 350, 342, 92, 92, pop, 0.88));
    return page;
  }
  page.elements.push(image(676, 78, 216, 280, photo));
  page.elements.push(shape("rect", 646, 388, 180, 46, pop, 0.95));
  page.elements.push(aiText(670, 401, 132, 18, slide.metric || theme.template?.name || "Field insight", 14, 900, "#ffffff"));
  page.elements.push(aiTitleText(48, 42, 585, slide.title, ink, 38));
  page.elements.push(shape("rect", 50, 112, 238, 8, accent));
  if (type === "agenda") {
    (slide.bullets.length ? slide.bullets : ["Context", "Challenges", "Support", "Future"]).slice(0, 5).forEach((item, itemIndex) => {
      const y = 158 + itemIndex * 58;
      page.elements.push(shape("circle", 70, y + 2, 20, 20, accent));
      page.elements.push(aiText(104, y - 4, 500, 42, item, item.length > 82 ? 17 : 20, 750, "#334155"));
    });
  } else if (type === "roadmap") {
    const items = (slide.bullets.length ? slide.bullets : ["Soil", "Water", "Crop", "Market"]).slice(0, 5);
    items.forEach((item, itemIndex) => {
      const x = 58 + itemIndex * 116;
      page.elements.push(shape("circle", x, 232, 70, 70, [accent, "#86efac", pop, "#65a30d", "#14b8a6"][itemIndex % 5]));
      page.elements.push(aiText(x + 25, 255, 24, 18, String(itemIndex + 1), 16, 900, "#ffffff"));
      page.elements.push(aiText(x - 8, 326, 100, 54, item, item.length > 28 ? 15 : 17, 800, ink));
    });
  } else {
    (slide.bullets.length ? slide.bullets : [slide.subtitle || slide.note || "Key point"]).slice(0, 4).forEach((item, itemIndex) => {
      const y = 162 + itemIndex * 67;
      page.elements.push(shape("circle", 70, y + 4, 18, 18, accent));
      page.elements.push(aiText(104, y - 5, 500, 56, item, item.length > 96 ? 17 : 20, 650, "#334155"));
    });
  }
  return page;
}

function makeDarkTechAiSlide(slide, index, total, theme, deck) {
  const [ink, paper, accent, pop] = theme.palette;
  const photo = theme.photos?.[index % theme.photos.length] || theme.photo;
  const altPhoto = theme.photos?.[(index + 1) % (theme.photos?.length || 1)] || photo;
  const type = String(slide.type || "").toLowerCase();
  const page = makeBlankPage(slide.title || `Slide ${index + 1}`);
  // Canva-style: deep navy/brand blue bg, yellow/gold accent headings
  const bgColor = ink || "#1a237e";
  const headingColor = pop || "#f5c518";   // yellow/gold like Canva car template
  const bodyColor = "#ffffff";
  const footerUrl = "codestrom.ai";

  // ── COVER: Canva-exact — right half full photo, left panel, parallelogram diagonal split ──
  if (type === "cover") {
    page.background = bgColor;
    const [iconCode, iconColor] = topicDecorIcon(deck.title || theme.footerLabel || "");
    page.elements = [
      // Full background brand color
      shape("rect", 0, 0, 960, 540, bgColor, 1),
      // Right side: full-bleed photo
      image(440, 0, 520, 540, photo),
      // Parallelogram creates the diagonal boundary between photo and panel
      poly("parallelogram-1", 400, 0, 100, 540, bgColor, 1),
      // Left panel solid
      shape("rect", 0, 0, 430, 540, bgColor, 1),
      // Thin gold vertical divider line
      shape("rect", 428, 0, 3, 540, headingColor, 0.8),
      // Decorative diamond shapes (Canva brand elements)
      poly("diamond-1", 340, 440, 80, 80, headingColor, 0.4),
      poly("diamond-1", 368, 464, 40, 40, headingColor, 0.25),
      // Star/spark decorative top-right of photo
      poly("spark-1", 820, 28, 60, 60, headingColor, 0.5),
      // Faint large topic icon watermark
      aiIcon(250, 330, 170, iconCode, iconColor, 0.1),
      // Top brand bar strip
      shape("rect", 0, 0, 430, 48, "#ffffff", 0.05),
      aiText(28, 14, 360, 22, (theme.footerLabel || deck.title || "PRESENTATION").toUpperCase(), 11, 900, headingColor),
      // Big bold title — Montserrat via aiTitleText
      aiTitleText(28, 80, 390, slide.title || deck.title, bodyColor, 52),
      // Subtitle line
      aiText(28, 242, 390, 62, slide.subtitle || deck.subtitle || "Where performance meets innovation", 17, 400, "rgba(255,255,255,0.78)", 1.35),
      // Gold accent bar
      shape("rect", 28, 316, 220, 6, headingColor, 1),
      // Tag-shape button at bottom
      poly("tag-1", 28, 428, 210, 40, headingColor, 0.92),
      aiText(44, 438, 180, 20, "EXPLORE", 11, 900, bgColor),
      // Footer URL
      aiText(28, 498, 240, 18, footerUrl, 11, 600, "rgba(255,255,255,0.45)"),
      // Slide counter
      aiText(874, 514, 48, 18, `${index + 1}/${total}`, 11, 700, "rgba(255,255,255,0.3)"),
    ];
    return page;
  }

  // ── CONTENT slides: Canva-style 50/50 split — photo left, branded blue content right ──
  page.background = bgColor;
  const bullets = (slide.bullets.length ? slide.bullets : [slide.subtitle || "Key point"]).slice(0, 4);

  if (["profile", "definition", "solution", "summary"].includes(type) || bullets.length <= 3) {
    // 50/50 split: photo left, content right (like Canva slide 2)
    page.elements = [
      shape("rect", 0, 0, 960, 540, bgColor, 1),
      // Left half photo
      image(0, 0, 460, 540, altPhoto),
      // Subtle overlay on photo for depth
      shape("rect", 0, 0, 460, 540, bgColor, 0.28),
      // Right blue content panel
      shape("rect", 460, 0, 500, 540, bgColor, 1),
      // Decorative top zigzag accent (Canva has brand icons here — simulated)
      shape("rect", 480, 20, 160, 8, headingColor, 0.9),
      shape("rect", 510, 34, 100, 6, headingColor, 0.5),
      shape("rect", 540, 46, 60, 4, headingColor, 0.3),
      // Brand logo area top-right
      shape("rect", 800, 14, 120, 30, headingColor, 0.15),
      aiText(806, 20, 110, 20, (theme.footerLabel || "BRAND").toUpperCase(), 10, 900, headingColor),
      // Slide title in gold
      aiText(480, 80, 440, 44, (slide.title || "").toUpperCase(), slide.title?.length > 28 ? 22 : 28, 900, headingColor),
      // Divider
      shape("rect", 480, 138, 380, 3, headingColor, 0.6),
    ];
    // Bullets as sub-sections (ORIGINS / EVOLUTION style)
    bullets.forEach((item, itemIndex) => {
      const y = 158 + itemIndex * 88;
      // Sub-heading label
      const subLabel = (slide.labels?.[itemIndex] || ["OVERVIEW", "KEY FACTS", "IMPACT", "FUTURE"][itemIndex] || "DETAIL").toUpperCase();
      page.elements.push(aiText(480, y, 400, 20, subLabel, 11, 900, headingColor));
      page.elements.push(aiText(480, y + 24, 430, 56, item, item.length > 110 ? 13 : 15, 400, bodyColor, 1.4));
    });
    page.elements.push(aiText(480, 498, 300, 18, footerUrl, 11, 600, "rgba(255,255,255,0.4)"));
    page.elements.push(aiText(874, 514, 48, 18, `${index + 1}/${total}`, 11, 700, "rgba(255,255,255,0.35)"));

  } else if (["metrics", "market", "stats", "impact", "comparison"].includes(type)) {
    // Stats layout: dark bg, colored metric cards in grid
    const labels = (slide.labels?.length ? slide.labels : ["Performance", "Safety", "Range", "Cost"]).slice(0, 4);
    const cardColors = [accent, headingColor, "#22d3ee", "#10b981"];
    page.elements = [
      shape("rect", 0, 0, 960, 540, bgColor, 1),
      shape("rect", 0, 0, 960, 52, "#ffffff", 0.06),
      aiText(28, 16, 700, 24, (slide.title || "").toUpperCase(), 16, 900, headingColor),
      shape("rect", 28, 58, 900, 3, headingColor, 0.4),
      aiText(874, 514, 48, 18, `${index + 1}/${total}`, 11, 700, "rgba(255,255,255,0.35)"),
      aiText(28, 498, 300, 18, footerUrl, 11, 600, "rgba(255,255,255,0.4)"),
    ];
    labels.forEach((label, i) => {
      const col = i % 2; const row = Math.floor(i / 2);
      const x = 28 + col * 458; const y = 82 + row * 200;
      const c = cardColors[i % cardColors.length];
      page.elements.push(shape("rect", x, y, 420, 172, "#ffffff", 0.05));
      page.elements.push(shape("rect", x, y, 420, 5, c, 1));
      page.elements.push(aiText(x + 16, y + 20, 360, 28, label.toUpperCase(), 15, 900, c));
      const bull = bullets[i] || "Key metric for this area";
      page.elements.push(aiText(x + 16, y + 60, 388, 96, bull, bull.length > 100 ? 13 : 15, 400, bodyColor, 1.35));
    });

  } else if (["challenges", "problem", "roadmap", "timeline", "process"].includes(type)) {
    // Challenges: numbered cards in a row
    const items = bullets.slice(0, 3);
    page.elements = [
      shape("rect", 0, 0, 960, 540, bgColor, 1),
      shape("rect", 0, 0, 960, 56, "#ffffff", 0.06),
      aiText(28, 16, 800, 26, (slide.title || "").toUpperCase(), 18, 900, headingColor),
      shape("rect", 28, 62, 900, 3, headingColor, 0.4),
      aiText(874, 514, 48, 18, `${index + 1}/${total}`, 11, 700, "rgba(255,255,255,0.35)"),
      aiText(28, 498, 300, 18, footerUrl, 11, 600, "rgba(255,255,255,0.4)"),
    ];
    items.forEach((item, i) => {
      const x = 28 + i * 310;
      page.elements.push(shape("rect", x, 82, 286, 380, "#ffffff", 0.06));
      page.elements.push(shape("rect", x, 82, 286, 5, [headingColor, accent, "#22d3ee"][i % 3], 1));
      // Big number
      page.elements.push(aiText(x + 16, 100, 60, 60, `0${i + 1}`, 44, 900, [headingColor, accent, "#22d3ee"][i % 3]));
      const subLabel = (slide.labels?.[i] || ["CHALLENGE", "BARRIER", "OBSTACLE"][i] || "POINT").toUpperCase();
      page.elements.push(aiText(x + 16, 168, 260, 22, subLabel, 12, 900, headingColor));
      page.elements.push(aiText(x + 16, 200, 258, 240, item, item.length > 120 ? 14 : 16, 400, bodyColor, 1.4));
    });

  } else {
    // General: full-bleed photo right, bullets left — Canva magazine style
    page.elements = [
      shape("rect", 0, 0, 960, 540, bgColor, 1),
      image(560, 0, 400, 540, photo),
      shape("rect", 560, 0, 400, 540, bgColor, 0.32),
      shape("rect", 540, 0, 24, 540, bgColor, 1),
      shape("rect", 0, 0, 960, 52, "#ffffff", 0.06),
      aiText(28, 14, 700, 26, (slide.title || "").toUpperCase(), 17, 900, headingColor),
      shape("rect", 28, 58, 500, 3, headingColor, 0.5),
      aiText(874, 514, 48, 18, `${index + 1}/${total}`, 11, 700, "rgba(255,255,255,0.35)"),
      aiText(28, 498, 300, 18, footerUrl, 11, 600, "rgba(255,255,255,0.4)"),
    ];
    bullets.forEach((item, i) => {
      const y = 76 + i * 98;
      const subLabel = (slide.labels?.[i] || ["KEY POINT", "DETAIL", "INSIGHT", "TAKEAWAY"][i] || "").toUpperCase();
      if (subLabel) page.elements.push(aiText(28, y, 480, 18, subLabel, 10, 900, headingColor));
      page.elements.push(aiText(28, y + (subLabel ? 22 : 4), 500, 66, item, item.length > 110 ? 14 : 16, 400, bodyColor, 1.38));
    });
  }
  return page;
}

function makeCleanBusinessAiSlide(slide, index, total, theme, deck) {
  const [ink, paper, accent, pop] = theme.palette;
  const photo = theme.photos?.[index % theme.photos.length] || theme.photo;
  const type = String(slide.type || "").toLowerCase();
  const page = makeBlankPage(slide.title || `Slide ${index + 1}`);
  page.background = "#f8fafc";
  page.elements = [
    shape("rect", 0, 0, 960, 540, "#f8fafc", 1),
    shape("rect", 36, 36, 888, 468, "#ffffff", 1),
    shape("rect", 36, 36, 10, 220, accent),
    aiText(64, 502, 350, 18, theme.footerLabel || theme.templateName || "Business", 11, 750, "#64748b"),
    aiText(854, 502, 48, 18, `${index + 1}/${total}`, 12, 800, "#64748b"),
  ];
  if (type === "cover") {
    page.elements.push(aiTitleText(84, 88, 560, slide.title || deck.title, ink, 50));
    page.elements.push(aiText(88, 232, 470, 76, slide.subtitle || deck.subtitle || "Business overview", 23, 650, "#475569"));
    page.elements.push(image(654, 92, 190, 270, photo));
    page.elements.push(shape("rect", 88, 360, 240, 10, accent));
    return page;
  }
  page.elements.push(aiTitleText(84, 70, 640, slide.title, ink, 38));
  if (["metrics", "market"].includes(type)) {
    page.elements.push(shape("rect", 92, 182, 210, 160, "#f1f5f9", 1));
    page.elements.push(shape("rect", 330, 182, 210, 160, "#f1f5f9", 1));
    page.elements.push(shape("rect", 568, 182, 210, 160, accent, 0.92));
    page.elements.push(aiText(122, 226, 150, 48, "Access", 32, 900, ink));
    page.elements.push(aiText(360, 226, 150, 48, "Quality", 32, 900, ink));
    page.elements.push(aiText(598, 226, 150, 48, slide.metric || "Outcome", 31, 900, "#ffffff"));
    page.elements.push(aiText(94, 382, 650, 38, slide.bullets[0] || "Measure practical progress with clear signals.", 18, 650, "#475569"));
  } else {
    (slide.bullets.length ? slide.bullets : [slide.subtitle || "Key point"]).slice(0, 4).forEach((item, itemIndex) => {
      const y = 160 + itemIndex * 64;
      page.elements.push(shape("rect", 92, y, 520, 48, itemIndex % 2 ? "#ffffff" : "#f1f5f9", 1));
      page.elements.push(shape("circle", 112, y + 14, 20, 20, accent));
      page.elements.push(aiText(150, y + 5, 430, 36, item, item.length > 82 ? 17 : 20, 650, "#334155"));
    });
    page.elements.push(image(670, 170, 168, 220, photo));
  }
  return page;
}

function makeEditorialSplitAiSlide(slide, index, total, theme, deck) {
  const [ink, paper, accent, pop] = theme.palette;
  const photo = theme.photos?.[index % theme.photos.length] || theme.photo;
  const type = String(slide.type || "").toLowerCase();
  const page = makeBlankPage(slide.title || `Slide ${index + 1}`);
  page.background = paper;
  page.elements = [
    shape("rect", 0, 0, 960, 540, paper, 1),
    image(0, 0, 360, 540, photo),
    shape("rect", 0, 0, 360, 540, ink, 0.38),
    shape("circle", 730, 376, 92, 92, pop, 0.85),
    aiText(56, 502, 320, 18, theme.footerLabel || theme.templateName || "Presentation", 11, 750, theme.muted),
    aiText(854, 502, 48, 18, `${index + 1}/${total}`, 12, 800, theme.muted),
  ];
  if (type === "cover") {
    page.elements.push(aiTitleText(420, 104, 430, slide.title || deck.title, ink, 50));
    page.elements.push(aiText(424, 244, 390, 82, slide.subtitle || deck.subtitle || "Presentation overview", 23, 650, "#475569"));
    page.elements.push(shape("rect", 424, 362, 240, 10, accent));
    return page;
  }
  page.elements.push(aiTitleText(414, 54, 470, slide.title, ink, 38));
  page.elements.push(shape("rect", 416, 124, 210, 8, accent));
  (slide.bullets.length ? slide.bullets : [slide.subtitle || "Key point"]).slice(0, 4).forEach((item, itemIndex) => {
    const y = 174 + itemIndex * 66;
    page.elements.push(shape("circle", 420, y + 6, 18, 18, accent));
    page.elements.push(aiText(456, y - 4, 380, 52, item, item.length > 78 ? 17 : 20, 650, "#334155"));
  });
  return page;
}

function makeAiPlanSlide(slide, index, total, theme, deck) {
  const templatedPage = makeTemplateFamilyAiSlide(slide, index, total, theme, deck);
  if (templatedPage) return templatedPage;
  return renderBlockSlide(slide, index, total, theme, deck);
}

function applyTemplate(templateId, withHistory = true, openEditor = true) {
  const template = templates.find((item) => item.id === templateId) || templates[0];
  const apply = () => {
    state.pages[state.pageIndex] = makePageFromTemplate(template);
    state.selectedId = null;
    state.selectedIds = [];
    if (openEditor) state.tool = "text";
  };
  if (withHistory) commit(apply);
  else apply();
}

function makePageFromTemplate(template) {
  if (template.category === "youtube") return makeYoutubePageFromTemplate(template);
  if (template.category === "charts") return makeChartPageFromTemplate(template);
  const [ink, paper, accent, pop] = template.palette;
  const page = makeBlankPage(template.name);
  page.background = template.layout === "poster" ? `linear-gradient(135deg, ${ink}, ${accent})` : paper;
  const base = {
    split: [
      text(70, 70, 480, 92, template.name, 66, 850, ink),
      text(74, 172, 410, 68, template.sub, 28, 650, ink),
      shape("rect", 74, 286, 280, 16, accent),
      image(570, 70, 320, 390, template.photo),
      shape("circle", 456, 366, 120, 120, pop),
    ],
    poster: [
      shape("circle", 700, -80, 270, 270, pop, 0.35),
      text(70, 72, 720, 126, template.name.toUpperCase(), 82, 900, "#ffffff"),
      text(74, 242, 475, 78, "Fresh original layout ready for your message", 30, 700, "#ffffff"),
      shape("pill", 74, 390, 245, 62, "#ffffff"),
      text(102, 406, 220, 36, "Edit this now", 25, 800, ink),
    ],
    clean: [
      shape("rect", 60, 58, 840, 424, "#ffffff"),
      shape("rect", 84, 82, 10, 220, accent),
      text(122, 84, 600, 78, template.name, 62, 850, ink),
      text(126, 178, 520, 72, template.sub, 27, 650, "#475569"),
      shape("rect", 126, 322, 150, 12, pop),
      image(640, 250, 210, 160, template.photo),
    ],
    photo: [
      image(0, 0, 960, 540, template.photo),
      shape("rect", 0, 0, 440, 540, `${ink}dd`),
      text(64, 76, 330, 132, template.name, 66, 850, "#ffffff"),
      text(68, 242, 310, 84, template.sub, 29, 650, "#e5e7eb"),
      shape("pill", 68, 386, 230, 58, accent),
    ],
    dashboard: [
      text(68, 58, 600, 64, template.name, 52, 850, ink),
      text(72, 126, 420, 44, "Summary, goals, and next actions", 23, 650, "#64748b"),
      shape("rect", 72, 218, 220, 170, "#ffffff"),
      shape("rect", 326, 218, 220, 170, "#ffffff"),
      shape("rect", 580, 218, 300, 170, accent),
      text(100, 250, 160, 48, "72%", 48, 850, ink),
      text(354, 250, 160, 48, "4.8x", 48, 850, ink),
      text(612, 250, 230, 48, "Next step", 44, 850, "#ffffff"),
    ],
  };
  page.elements = base[template.layout] || base.split;
  return page;
}

function makeYoutubePageFromTemplate(template) {
  const [paper, ink, accent, pop] = template.palette;
  const style = template.youtubeStyle || "creator";
  const page = makeBlankPage(template.name);
  page.background = paper;
  const dark = ["cinematic", "horror", "news", "ai-blue", "creator", "travel", "night", "film", "nature-talk", "ai-green", "cinematic-vlog", "adventure", "jungle", "moody", "fashion", "money", "podcast-red", "exposed", "sci-fi"].includes(style);
  const titleColor = dark ? "#ffffff" : ink;
  page.elements = [image(0, 0, 960, 540, template.photo)];
  page.elements.push(shape("rect", 0, 0, 960, 540, dark ? "#000000" : "#ffffff", dark ? 0.48 : 0.14));
  if (["finance", "red-news", "city"].includes(style)) page.elements.push(shape("rect", 0, 0, 960, 540, accent, 0.32));
  if (["podcast", "interview"].includes(style)) {
    page.elements.push(shape("rect", 0, 0, 520, 540, "#ffffff", 0.88));
    page.elements.push(text(56, 82, 470, 54, template.sub.toUpperCase(), 20, 850, accent));
    page.elements.push(text(56, 140, 460, 112, template.name.toUpperCase(), 66, 950, accent));
    page.elements.push(text(60, 284, 260, 54, "MONDAY\n22/08/27", 27, 900, accent));
    page.elements.push(shape("circle", 660, 238, 126, 126, pop, 0.9));
    page.elements.push(shape("rect", 744, 260, 82, 210, "#111827", 0.92));
  } else if (style === "horror") {
    page.elements.push(shape("rect", 0, 350, 960, 135, "#000000", 0.45));
    page.elements.push(text(300, 72, 360, 28, "DARK SECRETS REVEALED", 21, 900, "#ffffff"));
    page.elements.push(text(320, 320, 590, 105, template.name.toUpperCase(), 47, 950, accent));
  } else if (["news", "red-news"].includes(style)) {
    page.elements.push(shape("rect", 0, 0, 960, 540, "#7f0f0f", 0.55));
    page.elements.push(text(58, 102, 570, 135, "BREAKING\nNEWS", 70, 950, "#ffffff"));
    page.elements.push(shape("pill", 70, 310, 220, 36, "#ffffff"));
    page.elements.push(text(90, 318, 190, 20, style === "red-news" ? "HEARTBREAKING RESCUE" : "WORLD AFFAIRS", 16, 900, accent));
  } else if (style === "ai-blue") {
    page.elements.push(shape("rect", 0, 0, 500, 540, "#061845", 0.82));
    page.elements.push(text(42, 78, 580, 162, template.name.toUpperCase(), 61, 950, "#ffffff"));
    page.elements.push(shape("pill", 54, 356, 330, 54, pop));
    page.elements.push(text(78, 372, 270, 24, "10 TYPES NEURAL NETWORKS", 21, 900, "#ffffff"));
  } else if (style === "creator") {
    page.elements.push(shape("rect", 0, 0, 420, 540, "#0d3510", 0.8));
    page.elements.push(text(390, 86, 430, 62, "CREATIVE", 48, 950, "#ffffff"));
    page.elements.push(text(334, 168, 500, 105, "THUMBNAIL", 64, 950, accent));
    page.elements.push(text(422, 284, 360, 74, "DESIGN", 56, 950, "#ffffff"));
  } else if (style === "travel") {
    page.elements.push(text(88, 50, 600, 38, "BEST NATIONAL PARKS IN", 24, 650, "#ffffff"));
    page.elements.push(text(94, 100, 650, 120, "INDIA", 106, 950, "#ffffff"));
  } else if (style === "film") {
    page.elements.push(text(346, 202, 440, 116, "FILM", 118, 950, accent));
  } else if (style === "festival") {
    page.elements.push(shape("rect", 0, 0, 470, 540, "#a30f2d", 0.86));
    page.elements.push(text(50, 150, 350, 104, "HAPPY\nJANMASHTAMI", 46, 900, "#ffe9a6"));
    page.elements.push(text(54, 302, 360, 34, "Welcoming the Birth of Kanha", 23, 500, "#fff7ed"));
  } else if (style === "gaming") {
    page.elements.push(shape("rect", 500, 0, 460, 540, "#0040a8", 0.95));
    page.elements.push(text(564, 112, 310, 118, "GAME\nNIGHT!", 64, 950, "#ffffff"));
    page.elements.push(shape("pill", 610, 352, 230, 42, accent));
    page.elements.push(text(630, 363, 190, 22, "SUBSCRIBE NOW!", 19, 950, "#ffffff"));
  } else if (style === "bold-cutout") {
    page.elements.push(shape("rect", 40, 162, 500, 76, accent, 0.96));
    page.elements.push(shape("rect", 40, 274, 500, 76, accent, 0.96));
    page.elements.push(text(66, 178, 430, 48, "DEEPMIND", 44, 950, "#000000"));
    page.elements.push(text(66, 290, 430, 48, "UNCOVERED", 44, 950, "#000000"));
  } else if (style === "money") {
    page.elements.push(shape("rect", 0, 0, 520, 540, "#000000", 0.8));
    page.elements.push(text(52, 118, 420, 140, "MONEY\nMAKING\nIDEAS", 58, 950, "#ffffff"));
    page.elements.push(text(54, 328, 350, 28, "TRANSFORM YOUR FINANCES!", 20, 900, accent));
  } else if (style === "city") {
    page.elements.push(shape("rect", 0, 0, 960, 540, "#facc15", 0.35));
    page.elements.push(text(52, 165, 430, 92, "KOLKATA\nCHRONICLES", 55, 950, "#111827"));
    page.elements.push(shape("rect", 52, 360, 180, 56, "#000000"));
    page.elements.push(text(92, 377, 100, 22, "EXPLORE", 20, 900, "#facc15"));
  } else {
    page.elements.push(text(48, 72, 720, 122, template.name.toUpperCase(), 64, 950, titleColor));
    page.elements.push(text(54, 300, 360, 44, template.sub.toUpperCase(), 22, 850, accent));
  }
  page.elements.push(shape("rect", 0, 502, 960, 38, "#000000", 0.18));
  return page;
}

function makeChartPageFromTemplate(template) {
  const [ink, paper, accent, pop] = template.palette;
  const style = template.chartStyle || "bar";
  const page = makeBlankPage(template.name);
  page.background = paper;
  const titleColor = paper === "#151515" || paper === "#181818" || paper === "#20222c" ? "#ffffff" : ink;
  page.elements = [text(54, 34, 680, 44, template.name, 34, 850, titleColor)];
  if (style === "pie") {
    page.background = ink;
    page.elements = [
      text(58, 60, 260, 120, "PIE\nCHART", 58, 900, pop),
      ...pieSegments(560, 245, 145, [accent, pop, "#fb7185", "#2563eb"]),
      ...["40%", "30%", "20%", "10%"].map((label, index) => text(725 - index * 90, 110 + index * 82, 90, 34, label, 25, 800, "#ffffff")),
      shape("rect", 68, 280, 240, 150, "transparent", 1),
      ...["Housing", "Transportation", "Food", "Savings"].map((item, index) => text(104, 300 + index * 28, 170, 22, item, 16, 650, "#ffffff")),
    ];
  } else if (["donut", "pie-report", "cover-pie", "process-pie", "cost", "cycle"].includes(style)) {
    page.elements.push(...donutChart(455, 255, 150, [accent, pop, "#0e5d91", "#725187", "#67e8f9"]));
    page.elements.push(text(380, 225, 160, 60, style === "cover-pie" ? "Pie\nCharts" : "DATA\nBREAKDOWN", 28, 850, titleColor));
    page.elements.push(...["30%", "25%", "20%", "15%", "10%"].map((label, index) => text(700, 132 + index * 58, 170, 28, `${label}  Category ${index + 1}`, 20, 700, titleColor)));
  } else if (style === "org") {
    page.elements.push(shape("rect", 360, 96, 240, 46, accent));
    page.elements.push(text(388, 108, 190, 24, "Chief Executive", 19, 850, "#ffffff"));
    [170, 390, 610].forEach((x, index) => {
      page.elements.push(shape("rect", x, 190, 170, 40, pop, 0.85));
      page.elements.push(text(x + 24, 202, 120, 18, ["Sales", "Product", "Finance"][index], 16, 800, "#ffffff"));
      [0, 1, 2].forEach((row) => {
        page.elements.push(shape("rect", x - 22 + row * 70, 280, 64, 42, "#ffffff"));
        page.elements.push(text(x - 12 + row * 70, 292, 44, 14, "Team", 10, 700, ink));
      });
    });
  } else if (["table", "compare", "research"].includes(style)) {
    page.elements.push(shape("rect", 120, 112, 720, 340, "#ffffff"));
    for (let x = 120; x <= 840; x += 120) page.elements.push(shape("rect", x, 112, 2, 340, "#64748b", 0.6));
    for (let y = 112; y <= 452; y += 56) page.elements.push(shape("rect", 120, y, 720, 2, "#64748b", 0.6));
    ["Plan", "Free", "Plus", "Pro", "Team", "Enterprise"].forEach((item, index) => text(140 + index * 115, 126, 90, 22, item, 17, 850, ink));
    [1, 2, 3, 4, 5].forEach((row) => text(140, 126 + row * 56, 180, 22, `Feature ${row}`, 15, 650, "#475569"));
  } else if (["process", "steps", "process-line", "strategy", "chevrons"].includes(style)) {
    const xs = [120, 300, 480, 660, 820];
    xs.forEach((x, index) => {
      page.elements.push(shape("circle", x, 245, 78, 78, [accent, pop, "#38bdf8", "#14b8a6", "#94a3b8"][index]));
      page.elements.push(text(x + 29, 270, 30, 24, `0${index + 1}`, 19, 900, "#ffffff"));
      page.elements.push(text(x - 24, 350, 130, 42, ["Plan", "Research", "Build", "Launch", "Review"][index], 20, 800, titleColor));
      if (index < xs.length - 1) page.elements.push(shape("line", x + 78, 282, 100, 4, "#94a3b8", 0.75));
    });
  } else if (style === "funnel") {
    [[180, 128, 300, "#38bdf8"], [230, 218, 210, "#2dd4bf"], [280, 294, 120, "#67e8f9"], [330, 356, 40, "#0e5d91"]].forEach(([x, y, w, color], index) => {
      page.elements.push(shape("triangle", x, y, w, 96, color, 0.9));
      page.elements.push(text(650, y + 25, 220, 28, ["Attract", "Interact", "Convert", "Take it offline"][index], 25, 850, color));
    });
  } else if (["hex", "constellation", "world"].includes(style)) {
    page.background = ink;
    page.elements = [text(70, 54, 600, 44, template.name, 30, 850, accent)];
    [[380, 180, "01"], [300, 290, "03"], [460, 290, "05"], [620, 190, "02"], [700, 300, "06"]].forEach(([x, y, label], index) => {
      page.elements.push(shape("badge", x, y, 112, 112, [accent, pop, "#38bdf8"][index % 3]));
      page.elements.push(text(x + 38, y + 38, 45, 30, label, 25, 900, "#111827"));
    });
  } else if (style === "swot") {
    [[330, 150, "S"], [500, 150, "W"], [330, 300, "O"], [500, 300, "T"]].forEach(([x, y, label], index) => {
      page.elements.push(shape("rect", x, y, 150, 130, [accent, pop, "#c4a2dd", "#725187"][index]));
      page.elements.push(text(x + 55, y + 45, 50, 46, label, 42, 900, "#ffffff"));
    });
    ["Strengths", "Weaknesses", "Opportunities", "Threats"].forEach((label, index) => text(index % 2 ? 670 : 110, index < 2 ? 185 : 335, 180, 30, label, 20, 850, titleColor));
  } else if (["horizontal", "rank"].includes(style)) {
    ["USA", "France", "China", "Brazil", "Italy", "Japan", "India", "Canada"].forEach((name, index) => {
      const y = 110 + index * 38;
      page.elements.push(text(98, y, 100, 22, name, 16, 800, titleColor));
      page.elements.push(shape("rect", 190, y, 520 - index * 42, 22, [accent, "#38bdf8", "#60a5fa", "#8b5cf6", "#ec4899", "#f97316"][index % 6]));
    });
  } else {
    page.elements.push(...barChart(120, 130, 690, 300, [accent, pop, "#e11d48", "#22c55e", "#6366f1"]));
    page.elements.push(text(92, 462, 760, 28, "Replace values, labels, and categories with your own data.", 15, 500, "#64748b"));
  }
  return page;
}

function barChart(x, y, w, h, colors) {
  const values = [35, 55, 72, 98, 118, 170, 146, 62, 54, 31];
  return values.map((value, index) => shape("rect", x + index * (w / values.length), y + h - value, 34, value, colors[index % colors.length], 0.95));
}

function pieSegments(cx, cy, r, colors) {
  return colors.map((color, index) => shape("circle", cx + Math.cos(index * 1.55) * 30, cy + Math.sin(index * 1.55) * 28, r, r, color, 0.92));
}

function donutChart(cx, cy, r, colors) {
  const circles = colors.map((color, index) => shape("circle", cx - r / 2 + Math.cos(index * 1.2) * 32, cy - r / 2 + Math.sin(index * 1.2) * 28, r, r, color, 0.82));
  circles.push(shape("circle", cx - r / 4, cy - r / 4, r / 2, r / 2, "#ffffff", 1));
  return circles;
}

function applyPalette(palette) {
  commit(() => {
    const [ink, paper, accent, pop] = palette;
    const page = getPage();
    page.background = paper;
    page.elements.forEach((el, index) => {
      if (el.type === "text") el.color = index < 3 ? ink : el.color;
      if (el.type !== "text" && el.type !== "image") el.fill = [accent, pop, ink][index % 3];
    });
  });
}

function setBackground(color) {
  commit(() => (getPage().background = color));
}

function rememberPanelScroll() {
  const panelBody = document.querySelector(".panel-body");
  if (!panelBody) return;
  state.panelScrollTop = panelBody.scrollTop;
  state.panelScrollTool = state.tool;
}

function restorePanelScroll() {
  if (state.panelScrollTool !== state.tool) return;
  const panelBody = document.querySelector(".panel-body");
  if (!panelBody) return;
  requestAnimationFrame(() => {
    panelBody.scrollTop = state.panelScrollTop || 0;
  });
}

function setAnimationOption(id) {
  rememberPanelScroll();
  commit(() => {
    const current = getPage().animation || {};
    getPage().animation = { id, scope: current.scope || "both" };
    state.tool = "animate";
  });
}

function setAnimationScope(scope) {
  rememberPanelScroll();
  commit(() => {
    const current = getPage().animation || {};
    getPage().animation = { id: current.id || "simple", scope };
    state.tool = "animate";
  });
}

function setTransitionOption(name) {
  rememberPanelScroll();
  commit(() => {
    const current = getPage().transition || {};
    getPage().transition = { name, duration: Number(current.duration || 5), direction: current.direction || "right" };
    state.tool = "animate";
  });
}

function setTransitionDuration(value) {
  rememberPanelScroll();
  const page = getPage();
  const current = page.transition || {};
  page.transition = { name: current.name || "None", duration: Number(value), direction: current.direction || "right" };
  state.tool = "animate";
  render();
  pushCollabState();
}

function setTransitionDirection(direction) {
  rememberPanelScroll();
  commit(() => {
    const current = getPage().transition || {};
    getPage().transition = { name: current.name || "None", duration: Number(current.duration || 5), direction };
    state.tool = "animate";
  });
}

function removeAnimations() {
  rememberPanelScroll();
  commit(() => {
    getPage().animation = null;
    getPage().transition = { name: "None", duration: 5, direction: "right" };
    state.tool = "animate";
  });
}

function applyAnimationToAllPages() {
  rememberPanelScroll();
  commit(() => {
    const source = getPage();
    const animation = source.animation ? { ...source.animation } : null;
    const transition = source.transition ? { ...source.transition } : { name: "None", duration: 5, direction: "right" };
    state.pages.forEach((page) => {
      page.animation = animation ? { ...animation } : null;
      page.transition = { ...transition };
    });
    state.tool = "animate";
  });
}

function updateSelected(control, value) {
  const selected = getSelected();
  if (!selected) return;
  if (control === "opacity") selected.opacity = Number(value) / 100;
  if (control === "fontSize") selected.fontSize = Number(value);
  if (control === "fontFamily") selected.fontFamily = value;
  if (control === "rotate") selected.rotate = Number(value);
  if (control === "color") {
    if (selected.type === "text" || selected.type === "icon") selected.color = value;
    else selected.fill = value;
  }
  render();
  pushCollabState();
}

function beautify() {
  commit(() => {
    const page = getPage();
    const textEls = page.elements.filter((el) => el.type === "text");
    const photo = page.elements.find((el) => el.type === "image");
    textEls.forEach((el, index) => {
      el.x = 76;
      el.y = 72 + index * 88;
      el.w = index === 0 ? 560 : 420;
    });
    if (photo) Object.assign(photo, { x: 590, y: 82, w: 290, h: 376 });
  });
}

function addPage() {
  commit(() => {
    state.pages.push(makeBlankPage(`Page ${state.pages.length + 1}`));
    state.pageIndex = state.pages.length - 1;
    state.selectedId = null;
    state.selectedIds = [];
  });
}

function duplicatePage() {
  commit(() => {
    const copy = JSON.parse(JSON.stringify(getPage()));
    copy.id = crypto.randomUUID();
    copy.name = `${copy.name} copy`;
    copy.elements.forEach((el) => (el.id = crypto.randomUUID()));
    state.pages.splice(state.pageIndex + 1, 0, copy);
    state.pageIndex += 1;
    state.selectedId = null;
    state.selectedIds = [];
  });
}

function switchPage(index) {
  state.pageIndex = index;
  state.selectedId = null;
  state.selectedIds = [];
  render();
  pushCollabState();
  pushCollabPresence();
}

function handleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => addImage(reader.result);
  reader.readAsDataURL(file);
}

let photoSearchTimer = null;

function schedulePhotoSearch() {
  clearTimeout(photoSearchTimer);
  photoSearchTimer = setTimeout(runPhotoSearch, 400);
}

async function runPhotoSearch() {
  const query = (state.query || "").trim();
  if (!query) {
    state.photoSearch = null;
    state.photoSearchPending = false;
    render();
    return;
  }
  state.photoSearchPending = true;
  render();
  const params = new URLSearchParams({ q: query, per: "24" });
  try {
    const res = await fetch(`/api/photo-search?${params}`);
    const data = await res.json().catch(() => ({}));
    if ((state.query || "").trim() === query) {
      state.photoSearch = data.ok
        ? { query, photos: data.photos || [], source: data.source || "picsum", error: "" }
        : { query, photos: [], source: "", error: data.error || "Search failed" };
    }
  } catch {
    if ((state.query || "").trim() === query) {
      state.photoSearch = { query, photos: [], source: "", error: "Search server unreachable — showing stock photos" };
    }
  }
  state.photoSearchPending = false;
  if ((state.query || "").trim() === query) render();
}

function syncText(node) {
  const item = getPage().elements.find((el) => el.id === node.dataset.id);
  if (item && item.type === "text") {
    item.text = node.querySelector("[data-text-content]")?.innerText || "";
    autoGrowTextBox(item, node);
    refreshSlidePreviews();
    pushCollabState();
  }
}

function autoGrowTextBox(item, node) {
  if (!item.autoFit) return;
  const content = node.querySelector("[data-text-content]");
  if (!content) return;
  if (content.scrollHeight <= content.clientHeight + 1) return;
  const styles = getComputedStyle(content);
  const fontSize = Number.parseFloat(styles.fontSize) || Number(item.fontSize) || 24;
  const lineHeight = Number.parseFloat(styles.lineHeight) || fontSize * Number(item.lineHeight || 1.2);
  const nextHeight = clamp(Math.ceil(item.h + lineHeight), 28, CANVAS.h - item.y);
  if (nextHeight <= item.h) return;
  item.h = nextHeight;
  node.style.height = `${item.h}px`;
}

function removeSelected() {
  const page = getPage();
  const ids = new Set(getSelectedIds());
  page.elements = page.elements.filter((el) => !ids.has(el.id));
  state.selectedId = null;
  state.selectedIds = [];
}

function duplicateElement(selected) {
  const copy = { ...JSON.parse(JSON.stringify(selected)), id: crypto.randomUUID(), x: selected.x + 28, y: selected.y + 28 };
  getPage().elements.push(copy);
  state.selectedId = copy.id;
  state.selectedIds = [copy.id];
}

function duplicateSelectedElements() {
  const selected = getSelectedElements();
  if (!selected.length) return;
  const copies = selected.map((item) => ({ ...JSON.parse(JSON.stringify(item)), id: crypto.randomUUID(), x: item.x + 28, y: item.y + 28 }));
  getPage().elements.push(...copies);
  state.selectedId = copies[copies.length - 1].id;
  state.selectedIds = copies.map((copy) => copy.id);
}

function selectAllElements() {
  const ids = getPage().elements.map((el) => el.id);
  state.selectedIds = ids;
  state.selectedId = ids[ids.length - 1] || null;
  render();
}

function copySelectedElements(event) {
  const selected = getSelectedElements();
  if (!selected.length) return false;
  state.internalClipboard = selected.map((item) => JSON.parse(JSON.stringify(item)));
  if (event?.clipboardData) {
    event.clipboardData.setData("application/json", JSON.stringify({ type: "codestream-elements", elements: state.internalClipboard }));
    event.clipboardData.setData("text/plain", selected.map(layerName).join(", "));
    event.preventDefault();
  }
  return true;
}

function pasteInternalClipboard() {
  const source = state.internalClipboard || [];
  if (!source.length) return false;
  commit(() => {
    const copies = source.map((item) => ({ ...JSON.parse(JSON.stringify(item)), id: crypto.randomUUID(), x: item.x + 32, y: item.y + 32 }));
    getPage().elements.push(...copies);
    state.internalClipboard = copies.map((copy) => JSON.parse(JSON.stringify(copy)));
    state.selectedId = copies[copies.length - 1].id;
    state.selectedIds = copies.map((copy) => copy.id);
  });
  return true;
}

function handleCopy(event) {
  if (event.target?.matches?.("input, textarea, select, [contenteditable='true']")) return;
  copySelectedElements(event);
}

function handlePaste(event) {
  if (event.target?.matches?.("input, textarea, select, [contenteditable='true']")) return;
  const imageFile = [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith("image/"))?.getAsFile();
  if (imageFile) {
    event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => addImage(reader.result);
    reader.readAsDataURL(imageFile);
    return;
  }
  const html = event.clipboardData?.getData("text/html") || "";
  const htmlImage = extractImageSourceFromHtml(html);
  if (htmlImage) {
    event.preventDefault();
    addImage(htmlImage);
    return;
  }
  const textValue = (event.clipboardData?.getData("text/plain") || "").trim();
  if (isImageSource(textValue)) {
    event.preventDefault();
    addImage(textValue);
    return;
  }
  if (state.internalClipboard?.length) {
    event.preventDefault();
    pasteInternalClipboard();
  }
}

function extractImageSourceFromHtml(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.querySelector("img")?.getAttribute("src") || "";
}

function isImageSource(value) {
  return /^data:image\//i.test(value) || /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value);
}

function moveLayer(selected, direction) {
  const elements = getPage().elements;
  const index = elements.indexOf(selected);
  const next = clamp(index + direction, 0, elements.length - 1);
  elements.splice(index, 1);
  elements.splice(next, 0, selected);
}

function exportDesign(type = "png") {
  const exportType = String(type).toLowerCase();
  state.showDownloadMenu = false;
  state.shareMessage = "";
  render();

  if (exportType === "json") return download("design.json", JSON.stringify({ projectName: state.projectName, pages: state.pages }, null, 2), "application/json");
  if (exportType === "svg") return download("design.svg", buildSvg(), "image/svg+xml");
  if (exportType === "ppt" || exportType === "pptx") return exportPptx();
  if (exportType === "pdf") return exportPdf();
  if (exportType === "html") return exportHtml();
  if (exportType === "mp4") return exportVideo();
  if (exportType === "pngs" || exportType === "zip") return exportPngsZip();
  return exportPng();
}

function shareText() {
  return `${state.projectName || "Untitled design"} - ${shareUrl()}`;
}

function shareUrl() {
  return `${location.origin}${location.pathname}#${encodeURIComponent(state.projectName || "design")}`;
}

function copyShareLink(message) {
  return copyToClipboard(shareUrl(), message);
}

function copyEmbedCode() {
  const code = `<iframe title="${escapeAttr(state.projectName || "Design")}" src="${shareUrl()}" width="960" height="540"></iframe>`;
  return copyToClipboard(code, "Embed code copied");
}

function copyToClipboard(value, message) {
  const done = () => update({ showDownloadMenu: true, shareMessage: message }, false);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).then(done).catch(() => fallbackCopy(value, done));
    return;
  }
  fallbackCopy(value, done);
}

function fallbackCopy(value, done) {
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
  done();
}

function openShareUrl(url, message) {
  window.open(url, "_blank", "noopener,noreferrer");
  update({ showDownloadMenu: true, shareMessage: message }, false);
}

function presentDesign() {
  const win = window.open("", "_blank");
  if (!win) return update({ showDownloadMenu: true, shareMessage: "Popup blocked. Allow popups to present." }, false);
  const pagesData = state.pages.map((page) => ({
    name: page.name || "",
    note: page.speakerNote || page.aiRender?.slide?.speakerNote || page.aiRender?.slide?.note || "",
  }));
  const deckHtml = buildPowerPointHtml();
  const total = state.pages.length;
  const title = escapeHtml(state.projectName || "Presentation");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title} — Presenter</title><style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0b0e14; color: #e5e7eb; font-family: Inter, Arial, sans-serif; overflow: hidden; height: 100vh; }
    .topbar { position: fixed; top: 0; left: 0; right: 0; height: 48px; display: flex; align-items: center; gap: 12px; padding: 0 14px; background: rgba(17,21,29,.92); backdrop-filter: blur(8px); border-bottom: 1px solid #262d3a; z-index: 30; }
    .counter { font-size: 14px; font-weight: 800; color: #fff; }
    .timer { font-size: 13px; color: #9aa3b2; font-variant-numeric: tabular-nums; }
    .slide-timer { font-size: 12px; color: #6b7686; font-variant-numeric: tabular-nums; }
    .spacer { flex: 1; }
    .topbar button { border: 0; border-radius: 7px; background: #232a36; color: #dbe1ea; padding: 7px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .topbar button:hover { background: #2f3947; }
    .topbar button.active { background: #8b3dff; color: #fff; }
    .progress { position: fixed; top: 48px; left: 0; right: 0; height: 3px; background: #1c2230; z-index: 31; }
    #bar { height: 100%; background: #8b3dff; transition: width .2s; width: 0; }
    .stage { position: fixed; top: 51px; left: 16px; right: 384px; bottom: 16px; display: grid; place-items: center; overflow: hidden; }
    .stage section { box-shadow: 0 20px 60px rgba(0,0,0,.5); border-radius: 2px; }
    .side { position: fixed; top: 51px; right: 16px; width: 356px; bottom: 16px; display: flex; flex-direction: column; gap: 12px; z-index: 20; }
    .notes { flex: 1; background: #141922; border: 1px solid #262d3a; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
    .notes-head { padding: 10px 12px; font-size: 12px; font-weight: 800; color: #9aa3b2; border-bottom: 1px solid #262d3a; display: flex; justify-content: space-between; }
    #notesText { flex: 1; background: transparent; border: 0; outline: 0; resize: none; padding: 12px; color: #e5e7eb; font-size: 14px; line-height: 1.5; font-family: inherit; }
    .notes-actions { padding: 10px 12px; display: flex; align-items: center; gap: 10px; border-top: 1px solid #262d3a; }
    .notes-actions button { border: 0; border-radius: 7px; background: #8b3dff; color: #fff; padding: 7px 12px; font-size: 12px; font-weight: 800; cursor: pointer; }
    .notes-actions button:disabled { opacity: .5; cursor: default; }
    #hint { font-size: 11px; color: #8a93a3; flex: 1; }
    .next { background: #141922; border: 1px solid #262d3a; border-radius: 12px; padding: 8px; display: none; }
    .next.visible { display: block; }
    .next label { display: block; font-size: 11px; color: #8a93a3; font-weight: 800; padding: 2px 2px 8px; }
    .next .thumb { height: 112px; overflow: hidden; display: grid; place-items: center; border-radius: 8px; background: #0b0e14; }
    .laser { position: fixed; width: 22px; height: 22px; border-radius: 50%; background: radial-gradient(circle, #ff5252 0%, rgba(255,82,82,.65) 55%, transparent 72%); pointer-events: none; z-index: 40; display: none; transform: translate(-50%,-50%); }
    .laser.on { display: block; }
    .grid-view { position: fixed; top: 51px; left: 0; right: 0; bottom: 0; background: rgba(11,14,20,.94); backdrop-filter: blur(6px); overflow: auto; display: none; z-index: 25; padding: 24px; }
    .grid-view.open { display: block; }
    .grid-inner { display: grid; grid-template-columns: repeat(auto-fill, minmax(208px, 1fr)); gap: 18px; max-width: 1400px; margin: 0 auto; }
    .grid-item { background: #141922; border: 2px solid #262d3a; border-radius: 10px; padding: 8px; cursor: pointer; text-align: center; }
    .grid-item:hover { border-color: #8b3dff; }
    .grid-item.active { border-color: #8b3dff; background: #1a2030; }
    .grid-item .g-thumb { height: 117px; overflow: hidden; display: grid; place-items: center; border-radius: 6px; background: #0b0e14; }
    .grid-item b { display: block; margin-top: 8px; font-size: 12px; font-weight: 700; color: #dbe1ea; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media (max-width: 1100px) {
      .stage { right: 16px; bottom: 176px; }
      .side { left: 16px; right: 16px; top: auto; bottom: 0; height: 164px; width: auto; }
      .next { display: none !important; }
    }
  </style></head><body>
    <div class="topbar">
      <span class="counter" id="counter">1 / ${total}</span>
      <span class="timer" id="timer">00:00</span>
      <span class="slide-timer" id="slideTimer">0s</span>
      <span class="spacer"></span>
      <button id="btnGrid" title="Grid (G)">Grid</button>
      <button id="btnLaser" title="Laser pointer (L)">Laser</button>
      <button id="btnFull" title="Fullscreen (F)">Fullscreen</button>
      <button id="btnClose" title="Close (Esc)">Close</button>
    </div>
    <div class="progress"><div id="bar"></div></div>
    <div class="stage" id="stage"></div>
    <div class="side">
      <div class="next" id="nextBox"><label>Next</label><div class="thumb" id="nextThumb"></div></div>
      <div class="notes">
        <div class="notes-head"><span>Speaker notes</span><span id="saveState"></span></div>
        <textarea id="notesText" placeholder="Notes for this slide appear here. Edit them — they sync back to the deck."></textarea>
        <div class="notes-actions"><button id="btnNote">AI notes</button><span id="hint"></span></div>
      </div>
    </div>
    <div class="laser" id="laser"></div>
    <div class="grid-view" id="gridView"><div class="grid-inner" id="gridInner"></div></div>
    <script>
      const DATA = ${JSON.stringify(pagesData)};
      const HTML = ${JSON.stringify(deckHtml)};
      const parser = new DOMParser();
      const doc = parser.parseFromString(HTML, "text/html");
      const slides = Array.from(doc.body.children);
      const MAX = slides.length;
      let index = 0;
      const ui = {};
      ["counter","timer","slideTimer","bar","stage","nextBox","nextThumb","notesText","saveState","hint","laser","gridView","gridInner","btnGrid","btnLaser","btnFull","btnClose","btnNote"].forEach(function (id) { ui[id] = document.getElementById(id); });
      function fmt(ms) {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return (m < 10 ? "0" + m : m) + ":" + (sec < 10 ? "0" + sec : sec);
      }
      function rescale() {
        const cur = ui.stage.firstElementChild;
        if (!cur) return;
        const scale = Math.min(ui.stage.clientWidth / 960, ui.stage.clientHeight / 540);
        cur.style.transform = "scale(" + scale + ")";
      }
      function show(i, fromGrid) {
        index = Math.max(0, Math.min(MAX - 1, i));
        ui.counter.textContent = (index + 1) + " / " + MAX;
        ui.bar.style.width = ((index + 1) / MAX * 100).toFixed(1) + "%";
        ui.stage.innerHTML = "";
        const node = slides[index].cloneNode(true);
        node.classList.add("show");
        ui.stage.appendChild(node);
        rescale();
        ui.notesText.value = (DATA[index] && DATA[index].note) || "";
        ui.saveState.textContent = "";
        if (index + 1 < MAX) {
          ui.nextBox.className = "next visible";
          ui.nextThumb.innerHTML = "";
          const thumb = slides[index + 1].cloneNode(true);
          thumb.style.transform = "scale(" + (ui.nextThumb.clientWidth / 960) + ")";
          ui.nextThumb.appendChild(thumb);
        } else {
          ui.nextBox.className = "next";
        }
        if (ui.gridView.className.indexOf("open") >= 0) buildGrid();
        beginSlideTimer();
      }
      const slideStarts = [Date.now()];
      function beginSlideTimer() {
        slideStarts[index] = Date.now();
      }
      setInterval(function () {
        ui.timer.textContent = fmt(Date.now() - slideStarts[0]);
        ui.slideTimer.textContent = Math.floor((Date.now() - (slideStarts[index] || Date.now())) / 1000) + "s";
      }, 1000);
      function buildGrid() {
        ui.gridInner.innerHTML = "";
        slides.forEach(function (s, k) {
          const item = document.createElement("div");
          item.className = "grid-item" + (k === index ? " active" : "");
          const thumb = document.createElement("div");
          thumb.className = "g-thumb";
          const clone = s.cloneNode(true);
          clone.style.transform = "scale(0.22)";
          thumb.appendChild(clone);
          const name = document.createElement("b");
          name.textContent = (DATA[k] && DATA[k].name) || "Slide " + (k + 1);
          item.appendChild(thumb);
          item.appendChild(name);
          item.onclick = function () { show(k, true); };
          ui.gridInner.appendChild(item);
        });
      }
      function toggleGrid() {
        const open = ui.gridView.className.indexOf("open") < 0;
        ui.gridView.className = "grid-view" + (open ? " open" : "");
        if (open) buildGrid();
      }
      function toggleLaser() {
        const on = ui.laser.className.indexOf("on") < 0;
        ui.laser.className = "laser" + (on ? " on" : "");
        ui.btnLaser.classList.toggle("active", on);
      }
      function toggleFullscreen() {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) document.exitFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
      }
      let saveTimer = null;
      ui.notesText.addEventListener("input", function () {
        const idx = index;
        ui.saveState.textContent = "…";
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
          if (window.opener) window.opener.postMessage({ type: "speaker-note", index: idx, note: ui.notesText.value }, "*");
          ui.saveState.textContent = "Saved";
        }, 500);
      });
      ui.btnNote.addEventListener("click", function () {
        ui.btnNote.disabled = true;
        ui.hint.textContent = "Generating…";
        if (window.opener) window.opener.postMessage({ type: "generate-note", index: index }, "*");
      });
      addEventListener("message", function (e) {
        const m = e.data || {};
        if (m.type === "speaker-note" && m.index === index) {
          ui.notesText.value = m.note || "";
          ui.saveState.textContent = "AI";
          ui.hint.textContent = "";
          ui.btnNote.disabled = false;
        } else if (m.type === "note-error") {
          ui.hint.textContent = m.message || "Failed";
          ui.btnNote.disabled = false;
        } else if (m.type === "note-loading") {
          ui.hint.textContent = "Generating…";
        }
      });
      ui.btnGrid.addEventListener("click", toggleGrid);
      ui.btnLaser.addEventListener("click", toggleLaser);
      ui.btnFull.addEventListener("click", toggleFullscreen);
      ui.btnClose.addEventListener("click", function () { window.close(); });
      document.addEventListener("mousemove", function (e) {
        if (ui.laser.className.indexOf("on") >= 0) {
          ui.laser.style.left = e.clientX + "px";
          ui.laser.style.top = e.clientY + "px";
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;
        const k = e.key;
        if (ui.gridView.className.indexOf("open") >= 0 && k === "Escape") { toggleGrid(); return; }
        if (["ArrowRight", "ArrowDown", "PageDown", " "].indexOf(k) >= 0) { e.preventDefault(); show(index + 1); }
        else if (["ArrowLeft", "ArrowUp", "PageUp"].indexOf(k) >= 0) { e.preventDefault(); show(index - 1); }
        else if (k === "Home") show(0);
        else if (k === "End") show(MAX - 1);
        else if (k === "g" || k === "G") toggleGrid();
        else if (k === "f" || k === "F") toggleFullscreen();
        else if (k === "l" || k === "L") toggleLaser();
        else if (k === "Escape") window.close();
      });
      addEventListener("resize", rescale);
      show(0);
    </script></body></html>`);
  win.document.close();
  state.presenterWindow = win;
  update({ showDownloadMenu: false, shareMessage: "" }, false);
}

function handlePresenterMessage(event) {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "speaker-note" && Number.isInteger(msg.index)) {
    saveSpeakerNote(msg.index, msg.note || "");
  } else if (msg.type === "generate-note") {
    generateSlideNote(Number(msg.index));
  }
}

function saveSpeakerNote(index, note) {
  const page = state.pages[index];
  if (!page) return;
  page.speakerNote = String(note || "").slice(0, 600);
  if (page.aiRender && page.aiRender.slide) page.aiRender.slide.speakerNote = page.speakerNote;
  pushCollabState();
}

async function generateSlideNote(index) {
  const win = state.presenterWindow;
  if (!win || win.closed) return;
  const page = state.pages[index];
  const model = getActiveModel();
  if (!model) return win.postMessage({ type: "note-error", message: "No AI model active — add one in the Models panel." }, "*");
  if (!page) return win.postMessage({ type: "note-error", message: "Slide not found." }, "*");
  const texts = page.elements.filter((el) => el.type === "text").map((el) => el.text).filter(Boolean).slice(0, 12);
  win.postMessage({ type: "note-loading", index }, "*");
  try {
    const result = await callConfiguredModel(model, [
      { role: "system", content: "You are a presentation coach. Write one concise speaker note (2-3 sentences of natural spoken English, no markdown, no headings)." },
      { role: "user", content: `Slide: "${page.name || ""}"\nContent: ${texts.join(" | ").slice(0, 900)}\n\nWrite what the presenter should say aloud when showing this slide.` },
    ], { maxTokens: 220, json: false });
    if (!result.ok) return win.postMessage({ type: "note-error", message: result.error || "AI note generation failed." }, "*");
    const note = cleanAiText(result.content, 400);
    saveSpeakerNote(index, note);
    win.postMessage({ type: "speaker-note", index, note }, "*");
  } catch (error) {
    win.postMessage({ type: "note-error", message: error.message || "AI note generation failed." }, "*");
  }
}

function exportPdf() {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return update({ showDownloadMenu: true, shareMessage: "Popup blocked. Allow popups to export PDF." }, false);
  const html = buildPowerPointHtml();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(state.projectName || "Design")}</title><style>
    @page { size: 960px 540px; margin: 0; }
    @media print {
      @page { margin: 0; }
      body { margin: 0; }
      .slide-page { page-break-after: always; break-after: page; }
      .slide-page:last-child { page-break-after: avoid; break-after: avoid; }
      .no-print { display: none !important; }
    }
    body { margin: 0; background: #111827; font-family: Inter, Arial, sans-serif; }
    .pdf-deck { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 24px; }
    .slide-page { width: 960px; height: 540px; transform-origin: 0 0; box-shadow: 0 8px 32px rgba(0,0,0,.3); background: #fff; position: relative; overflow: hidden; }
    .slide-page:nth-child(1) { margin-top: 0; }
    .pdf-actions { position: fixed; bottom: 20px; left: 50%; translate: -50% 0; display: flex; gap: 12px; z-index: 10; }
    .pdf-actions button { border: 0; border-radius: 8px; background: #8b3dff; color: #fff; padding: 10px 18px; font-weight: 700; cursor: pointer; }
    .pdf-actions button:hover { background: #7c3aed; }
    @media print { .pdf-actions { display: none !important; } }
  </style></head><body><div class="pdf-deck" id="deck">${html}</div><div class="pdf-actions no-print"><button onclick="window.print()">${icons.download} Print / Save as PDF</button><button onclick="window.close()">Close</button></div><script>
    // Auto-scale slides to fit printable area if needed
    const slides = document.querySelectorAll('.slide-page');
    slides.forEach(s => {
      const scale = Math.min(window.innerWidth / 980, window.innerHeight / 580, 1);
      if (scale < 1) s.style.transform = 'scale(' + scale + ')';
    });
    window.onload = () => { setTimeout(() => window.print(), 300); };
  </script></body></html>`);
  win.document.close();
  update({ showDownloadMenu: false, shareMessage: "" }, false);
}

function downloadMenu() {
  const choice = prompt("Export as: png, svg, ppt, json", "png");
  if (!choice) return;
  return exportDesign(choice);
}

function buildSvg() {
  return buildSvgForPage(getPage());
}

function buildSvgForPage(page) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.w}" height="${CANVAS.h}" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}">
    <rect width="${CANVAS.w}" height="${CANVAS.h}" fill="${page.background.startsWith("#") ? page.background : "#fff"}"/>
    ${page.elements.map(elementToSvg).join("")}
  </svg>`;
}

function elementToSvg(el) {
  const opacity = el.opacity ?? 1;
  const rotate = el.rotate ? ` transform="rotate(${el.rotate} ${el.x + el.w / 2} ${el.y + el.h / 2})"` : "";
  if (el.type === "text") return `<text x="${el.x}" y="${el.y + el.fontSize}" font-family="${xmlAttr(el.fontFamily || "Inter")}" font-size="${el.fontSize}" font-weight="${el.fontWeight}" fill="${xmlAttr(el.color)}" opacity="${opacity}"${rotate}>${xmlText(el.text)}</text>`;
  if (el.type === "icon") return `<text x="${el.x + el.w / 2}" y="${el.y + el.h / 2}" text-anchor="middle" dominant-baseline="central" font-family="Segoe UI Symbol, Arial Unicode MS, sans-serif" font-size="${el.fontSize || Math.min(el.w, el.h)}" fill="${xmlAttr(el.color || "#111827")}" opacity="${opacity}"${rotate}>${xmlText(String.fromCodePoint(Number(el.code) || 9632))}</text>`;
  if (el.type === "image") return `<image href="${xmlAttr(el.src)}" x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" preserveAspectRatio="xMidYMid slice" opacity="${opacity}"${rotate}/>`;
  if (el.type === "video") return `<image href="${xmlAttr(el.poster || "")}" x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" preserveAspectRatio="xMidYMid slice" opacity="${opacity}"${rotate}/>`;
  if (el.type === "shapeAsset") return shapeAssetToSvg(el, opacity, rotate);
  if (el.type === "circle" || el.type === "badge") return `<ellipse cx="${el.x + el.w / 2}" cy="${el.y + el.h / 2}" rx="${el.w / 2}" ry="${el.h / 2}" fill="${xmlAttr(el.fill)}" opacity="${opacity}"${rotate}/>`;
  if (el.type === "triangle") return `<polygon points="${el.x + el.w / 2},${el.y} ${el.x + el.w},${el.y + el.h} ${el.x},${el.y + el.h}" fill="${xmlAttr(el.fill)}" opacity="${opacity}"${rotate}/>`;
  return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="${el.type === "pill" ? el.h / 2 : 0}" fill="${xmlAttr(el.fill)}" opacity="${opacity}"${rotate}/>`;
}

function buildPowerPointHtml() {
  return `<html><head><meta charset="utf-8"></head><body>${state.pages.map((page) => `<section style="position:relative;width:${CANVAS.w}px;height:${CANVAS.h}px;background:${page.background};overflow:hidden;page-break-after:always;">${page.elements.map(elementToHtml).join("")}</section>`).join("")}</body></html>`;
}

function elementToHtml(el) {
  const base = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;opacity:${el.opacity ?? 1};`;
  if (el.type === "text") return `<div style="${base}font-family:${el.fontFamily || "Inter"};font-size:${el.fontSize}px;font-weight:${el.fontWeight};color:${el.color};line-height:${el.lineHeight || 1.05};">${escapeHtml(el.text)}</div>`;
  if (el.type === "icon") return `<div style="${base}display:grid;place-items:center;font-family:'Segoe UI Symbol','Arial Unicode MS',sans-serif;font-size:${el.fontSize || Math.min(el.w, el.h)}px;color:${el.color || "#111827"};line-height:1;">${iconEntity(el.code)}</div>`;
  if (el.type === "image") return `<img src="${el.src}" style="${base}object-fit:cover;" />`;
  if (el.type === "video") return `<video src="${el.src}" poster="${el.poster || ""}" style="${base}object-fit:cover;" muted loop controls></video>`;
  if (el.type === "shapeAsset") {
    const asset = getShapeAsset(el.shapeId) || shapeAssets[0];
    return `<div style="${base}${shapeAssetElementStyle(asset, el)}">${shapeAssetElementInner(asset, el)}</div>`;
  }
  return `<div style="${base}background:${el.fill};border-radius:${el.type === "circle" || el.type === "badge" || el.type === "pill" ? "999px" : "0"};clip-path:${el.type === "triangle" ? "polygon(50% 0,100% 100%,0 100%)" : "none"};"></div>`;
}

function exportPptx() {
  const blob = buildPptxBlob();
  downloadBlob("design.pptx", blob);
}

function buildPptxBlob() {
  const files = {};
  files["[Content_Types].xml"] = pptContentTypes();
  files["_rels/.rels"] = pptRootRels();
  files["docProps/core.xml"] = pptCoreXml();
  files["docProps/app.xml"] = pptAppXml();
  files["ppt/presentation.xml"] = pptPresentationXml();
  files["ppt/_rels/presentation.xml.rels"] = pptPresentationRelsXml();
  files["ppt/theme/theme1.xml"] = pptThemeXml();
  files["ppt/slideMasters/slideMaster1.xml"] = pptSlideMasterXml();
  files["ppt/slideMasters/_rels/slideMaster1.xml.rels"] = pptSlideMasterRelsXml();
  files["ppt/slideLayouts/slideLayout1.xml"] = pptSlideLayoutXml();
  files["ppt/slideLayouts/_rels/slideLayout1.xml.rels"] = pptSlideLayoutRelsXml();
  state.pages.forEach((_, index) => {
    files[`ppt/slides/slide${index + 1}.xml`] = pptSlideXml(index + 1);
    files[`ppt/slides/_rels/slide${index + 1}.xml.rels`] = pptSlideRelsXml(index + 1);
  });
  return zipStored(files, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
}

function pptContentTypes() {
  const slideOverrides = state.pages.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${slideOverrides}</Types>`;
}

function pptRootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
}

function pptCoreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlText(state.projectName || "Design")}</dc:title><dc:creator>Codestream</dc:creator><cp:lastModifiedBy>Codestream</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
}

function pptAppXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Codestream</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>${state.pages.length}</Slides></Properties>`;
}

function pptPresentationXml() {
  const slides = state.pages.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides}</p:sldIdLst><p:sldSz cx="${CANVAS.w * 9525}" cy="${CANVAS.h * 9525}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`;
}

function pptPresentationRelsXml() {
  const slideRels = state.pages.map((_, index) => `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slideRels}</Relationships>`;
}

function pptSlideXml(index) {
  const page = state.pages[index - 1];
  const cx = CANVAS.w * 9525;
  const cy = CANVAS.h * 9525;
  const bgColor = (page.background.startsWith("#") ? page.background : "#ffffff").replace("#", "").toUpperCase();
  const shapes = page.elements.map((el, i) => pptElementXml(el, 3 + i));
  const bgRect = `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Background"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${pptXfrm({ x: 0, y: 0, w: CANVAS.w, h: CANVAS.h })}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${bgColor}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${bgRect}${shapes.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function pptElementXml(el, id) {
  if (el.type === "image" || el.type === "video") return pptImageXml(el, id);
  if (el.type === "icon") return pptIconXml(el, id);
  if (el.type === "shapeAsset") return pptShapeAssetXml(el, id);
  return pptShapeXml(el, id);
}

function pptShapeXml(el, id) {
  const isText = el.type === "text";
  let prst = "rect";
  let adj = "";
  if (el.type === "circle" || el.type === "badge") prst = "ellipse";
  else if (el.type === "triangle") prst = "triangle";
  else if (el.type === "pill") { prst = "roundRect"; adj = `<a:avLst><a:gd name="adj" fmla="val 50000"/></a:avLst>`; }
  const alpha = el.opacity && el.opacity < 1 ? `<a:alpha val="${Math.round(el.opacity * 100000)}"/>` : "";
  const fill = isText || el.fill === "transparent" ? `<a:noFill/>` : `<a:solidFill><a:srgbClr val="${pptColor(el.fill)}"${alpha}/></a:solidFill>`;
  const body = isText ? pptTextBody(el) : "<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>";
  const algn = el.align === "center" ? ' algn="ctr"' : el.align === "right" ? ' algn="r"' : "";
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlAttr(layerName(el))}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${pptXfrm(el)}<a:prstGeom prst="${prst}">${adj}<a:avLst/></a:prstGeom>${fill}<a:ln><a:noFill/></a:ln></p:spPr>${body}</p:sp>`;
}

function pptTextBody(el) {
  const lines = String(el.text || "").split(/\n/);
  const fontSize = Math.max(1, Math.round((el.fontSize || 24) * 100));
  const alpha = el.opacity && el.opacity < 1 ? `<a:alpha val="${Math.round(el.opacity * 100000)}"/>` : "";
  const algn = el.align === "center" ? ' algn="ctr"' : el.align === "right" ? ' algn="r"' : "";
  const runs = lines.map((line) => `<a:p${algn}><a:r><a:rPr lang="en-US" sz="${fontSize}" b="${Number(el.fontWeight || 400) >= 700 ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${pptColor(el.color)}"${alpha}/></a:solidFill><a:latin typeface="${xmlAttr(el.fontFamily || "Inter")}"/></a:rPr><a:t>${xmlText(line || " ")}</a:t></a:r><a:endParaRPr lang="en-US" sz="${fontSize}"/></a:p>`).join("");
  return `<p:txBody><a:bodyPr wrap="square" anchor="t"/><a:lstStyle/>${runs}</p:txBody>`;
}

function pptIconXml(el, id) {
  const char = String.fromCodePoint(Number(el.code) || 9632);
  const fontSize = Math.max(1, Math.round((el.fontSize || Math.min(el.w, el.h)) * 100));
  const alpha = el.opacity && el.opacity < 1 ? `<a:alpha val="${Math.round(el.opacity * 100000)}"/>` : "";
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlAttr(el.name || "Icon")}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${pptXfrm(el)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="none" anchor="ctr"/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="${fontSize}" dirty="0"><a:solidFill><a:srgbClr val="${pptColor(el.color || "#111827")}"${alpha}/></a:solidFill><a:latin typeface="Segoe UI Symbol"/><a:ea typeface="Segoe UI Symbol"/><a:cs typeface="Segoe UI Symbol"/></a:rPr><a:t>${xmlText(char)}</a:t></a:r></a:p></p:txBody></p:sp>`;
}

function pptShapeAssetXml(el, id) {
  const asset = getShapeAsset(el.shapeId);
  if (!asset) return pptShapeXml({ ...el, type: "rect" }, id);
  let prst = "rect";
  let adj = "";
  if (asset.kind === "line") {
    // Thin horizontal rect at vertical center
    prst = "rect";
  } else if (asset.kind === "grid") {
    prst = "rect";
  } else if (asset.kind === "shape") {
    const clip = asset.clip || "";
    if (clip.includes("polygon(50% 0,100% 100%,0 100%)")) prst = "triangle";
    else if (clip.includes("polygon(50% 0,100% 50%,50% 100%,0 50%)")) prst = "diamond";
    else if (clip.includes("polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)")) prst = "hexagon";
    else if (clip.includes("polygon(50% 0,98% 35%,80% 100%,20% 100%,2% 35%)")) prst = "pentagon";
    else if (clip.includes("polygon(35% 0,65% 0,65% 35%,100% 35%,100% 65%,65% 65%,65% 100%,35% 100%,35% 65%,0 65%,0 35%)")) prst = "cross";
    else if (clip.includes("polygon(50% 0,60% 38%,100% 50%,60% 62%,50% 100%,40% 62%,0 50%,40% 38%)")) prst = "star4";
    else if (clip.includes("polygon(0 72%,30% 72%,30% 48%,55% 48%,55% 25%,80% 25%,80% 0,100% 0,100% 100%,0 100%)")) prst = "rect";
    else if (asset.radius === "999px" || clip.includes("circle") || clip.includes("ellipse")) prst = "ellipse";
    else prst = "roundRect", adj = `<a:avLst><a:gd name="adj" fmla="val 20000"/></a:avLst>`;
  }
  const alpha = el.opacity && el.opacity < 1 ? `<a:alpha val="${Math.round(el.opacity * 100000)}"/>` : "";
  const fill = el.fill === "transparent" ? `<a:noFill/>` : `<a:solidFill><a:srgbClr val="${pptColor(el.fill)}"${alpha}/></a:solidFill>`;
  if (asset.kind === "line") {
    // horizontal line via thin rect
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlAttr(el.name || "Line")}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${pptXfrm(el)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill}<a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`;
  }
  if (asset.kind === "grid") {
    // grid as rect with outline
    return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlAttr(el.name || "Grid")}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${pptXfrm(el)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln w="9525"><a:solidFill><a:srgbClr val="${pptColor(el.fill)}"/></a:solidFill></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`;
  }
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlAttr(el.name || "Shape")}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${pptXfrm(el)}<a:prstGeom prst="${prst}">${adj}<a:avLst/></a:prstGeom>${fill}<a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`;
}

function pptImageXml(el, id) {
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${xmlAttr(layerName(el))}"/><p:cNvPicPr><a:picLocks noChangeAspect="0"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:link="rIdImg${el.id}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${pptXfrm(el)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
}

function pptSlideRelsXml(index) {
  const page = state.pages[index - 1];
  const rels = [`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`];
  page.elements.forEach((el) => {
    const src = el.type === "video" ? el.poster : el.type === "image" ? el.src : "";
    if (src) rels.push(`<Relationship Id="rIdImg${el.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${xmlAttr(src)}" TargetMode="External"/>`);
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`;
}

function pptSlideMasterXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;
}

function pptSlideMasterRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`;
}

function pptSlideLayoutXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
}

function pptSlideLayoutRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;
}

function pptThemeXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Codestream"><a:themeElements><a:clrScheme name="Codestream"><a:dk1><a:srgbClr val="111827"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="334155"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="8B3DFF"/></a:accent1><a:accent2><a:srgbClr val="22D3EE"/></a:accent2><a:accent3><a:srgbClr val="F97316"/></a:accent3><a:accent4><a:srgbClr val="10B981"/></a:accent4><a:accent5><a:srgbClr val="EF4444"/></a:accent5><a:accent6><a:srgbClr val="FACC15"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="Codestream"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Codestream"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"/></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="50000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

function pptColor(value) {
  const color = String(value || "#ffffff").match(/#([0-9a-f]{3,8})/i)?.[1] || "ffffff";
  const normalized = color.length === 3 ? color.split("").map((char) => char + char).join("") : color.slice(0, 6);
  return normalized.toUpperCase();
}

function xmlText(value) {
  return String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]));
}

function xmlAttr(value) {
  return xmlText(value).replace(/"/g, "&quot;");
}

function zipStored(files, type) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = typeof content === "string" ? encoder.encode(content) : content;
    const crc = crc32(data);
    const local = concatBytes([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes, data,
    ]);
    const central = concatBytes([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes,
    ]);
    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  });
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = concatBytes([u32(0x06054b50), u16(0), u16(0), u16(centralParts.length), u16(centralParts.length), u32(centralSize), u32(offset), u16(0)]);
  return new Blob([...localParts, ...centralParts, end], { type });
}

function u16(value) {
  return new Uint8Array([value & 255, (value >>> 8) & 255]);
}

function u32(value) {
  return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function crc32(bytes) {
  let crc = -1;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[index]) & 255];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = (() => {
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

function exportPng() {
  pageToPngBlob(getPage()).then((blob) => {
    if (blob) downloadBlob("design.png", blob);
  });
}

function pageToPngBlob(page) {
  return new Promise((resolve) => {
    const svg = buildSvgForPage(page);
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS.w;
      canvas.height = CANVAS.h;
      canvas.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

async function exportPngsZip() {
  const pages = state.pages;
  const files = {};
  let rendered = 0;
  for (let i = 0; i < pages.length; i += 1) {
    const blob = await pageToPngBlob(pages[i]);
    if (blob) {
      files[`slide-${String(i + 1).padStart(2, "0")}.png`] = new Uint8Array(await blob.arrayBuffer());
      rendered += 1;
    }
  }
  if (!rendered) return;
  downloadBlob("design-slides.zip", zipStored(files, "application/zip"));
  state.shareMessage = `${rendered}/${pages.length} slides exported as PNG (ZIP)`;
}

// ── MP4 / WebM video export — pre-renders each slide to PNG, then
//    animates the transition mathematically on canvas, captured via
//    canvas.captureStream + MediaRecorder ─────────────────────────────
function exportVideo() {
  if (!state.pages.length || state.videoExporting) return;
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    state.shareMessage = "Video export not supported in this browser — use Chrome or Edge.";
    return;
  }
  const pages = state.pages;
  state.videoExporting = true;
  state.shareMessage = "Preparing slides...";
  render();

  const W = CANVAS.w;
  const H = CANVAS.h;
  const scale = 2; // 1920x1080 output
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  canvas.style.cssText = "position:fixed;left:-10000px;top:0;opacity:0;pointer-events:none;";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;

  const supported = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    .find((mime) => MediaRecorder.isTypeSupported(mime)) || "";
  const isMp4 = supported.includes("mp4");
  const recorder = new MediaRecorder(canvas.captureStream(30), supported ? { mimeType: supported, videoBitsPerSecond: 8_000_000 } : undefined);
  const chunks = [];
  recorder.ondataavailable = (event) => { if (event.data && event.data.size) chunks.push(event.data); };

  const FPS = 30;
  const frame = () => new Promise((resolve) => setTimeout(resolve, 1000 / FPS));
  const drawStatic = (bitmap) => {
    ctx.save();
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    if (bitmap) ctx.drawImage(bitmap, 0, 0, W, H);
    ctx.restore();
  };

  (async () => {
    try {
      const bitmaps = new Array(pages.length);
      for (let i = 0; i < pages.length; i += 1) {
        state.shareMessage = `Rendering slide ${i + 1}/${pages.length}...`;
        render();
        const blob = await pageToPngBlob(pages[i]);
        bitmaps[i] = blob ? await createImageBitmap(blob).catch(() => null) : null;
      }
      recorder.start(300);
      for (let i = 0; i < pages.length; i += 1) {
        state.shareMessage = `Recording slide ${i + 1}/${pages.length}...`;
        render();
        const duration = clamp(Number(pages[i].transition?.duration || 5), 2, 6);
        const type = (pages[i].transition?.name || "None").toLowerCase();
        const dir = pages[i].transition?.direction || "right";
        const prev = i > 0 ? bitmaps[i - 1] : null;
        const curr = bitmaps[i];
        const motion = (type === "none" || type === "cut") ? 0 : Math.min(1.6, Math.max(0.9, duration * 0.3));
        const motionFrames = Math.round(motion * FPS);
        const holdFrames = Math.round(Math.max(duration - motion, 1) * FPS);
        for (let f = 0; f < motionFrames + holdFrames; f += 1) {
          if (i === 0 || motion === 0) {
            drawStatic(curr);
          } else {
            transitionFrame(ctx, W, H, scale, type, dir, prev, curr, Math.min(f / motionFrames, 1));
          }
          await frame();
        }
      }
    } catch (error) {
      console.error("[Video] Recording failed:", error);
      state.shareMessage = "Video export failed: " + (error.message || error);
    }
    recorder.requestData();
    recorder.stop();
    await Promise.race([
      new Promise((resolve) => { recorder.onstop = () => resolve(); }),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    const blob = new Blob(chunks, { type: supported || "video/webm" });
    state.videoExporting = false;
    if (blob && blob.size) {
      downloadBlob(`${slug(state.projectName || "design")}-video.${isMp4 ? "mp4" : "webm"}`, blob);
      state.shareMessage = `Video exported (${Math.round(blob.size / 1024)} KB)`;
    } else {
      state.shareMessage = "Video export failed — no data recorded.";
    }
    canvas.remove();
    render();
  })();
}

function transitionFrame(ctx, W, H, scale, type, dir, prev, curr, t) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const dx = dir === "right" ? W * (1 - t) : dir === "left" ? -W * (1 - t) : 0;
  const dy = dir === "down" ? H * (1 - t) : dir === "up" ? -H * (1 - t) : 0;
  if (type === "push") {
    if (prev) ctx.drawImage(prev, -dx, -dy, W, H);
    ctx.drawImage(curr, dx, dy, W, H);
  } else if (type === "cover") {
    if (prev) ctx.drawImage(prev, 0, 0, W, H);
    ctx.drawImage(curr, dx, dy, W, H);
  } else if (type === "uncover") {
    ctx.drawImage(curr, 0, 0, W, H);
    if (prev) ctx.drawImage(prev, dx, dy, W, H);
  } else if (type === "wipe") {
    if (prev) ctx.drawImage(prev, 0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    if (dir === "right") ctx.rect(W * (1 - t), 0, W * t, H);
    else if (dir === "left") ctx.rect(0, 0, W * t, H);
    else if (dir === "down") ctx.rect(0, H * (1 - t), W, H * t);
    else ctx.rect(0, 0, W, H * t);
    ctx.clip();
    ctx.drawImage(curr, 0, 0, W, H);
    ctx.restore();
  } else if (type === "split") {
    if (prev) ctx.drawImage(prev, 0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect((W / 2) * (1 - t), 0, (W / 2) * t, H);
    ctx.rect(W / 2, 0, (W / 2) * t, H);
    ctx.clip();
    ctx.drawImage(curr, 0, 0, W, H);
    ctx.restore();
  } else if (type === "reveal") {
    if (prev) ctx.drawImage(prev, 0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W * t, H);
    ctx.clip();
    ctx.drawImage(curr, 0, 0, W, H);
    ctx.restore();
  } else if (type === "flash") {
    ctx.drawImage(curr, 0, 0, W, H);
    ctx.fillStyle = `rgba(255,255,255,${1 - t})`;
    ctx.fillRect(0, 0, W, H);
  } else if (type === "random-bars") {
    if (prev) ctx.drawImage(prev, 0, 0, W, H);
    const bars = 8;
    const bw = W / bars;
    ctx.save();
    ctx.beginPath();
    for (let k = 0; k < bars; k += 1) {
      ctx.rect(k * bw, 0, bw * clamp((t - (k / bars) * 0.5) / 0.5, 0, 1), H);
    }
    ctx.clip();
    ctx.drawImage(curr, 0, 0, W, H);
    ctx.restore();
  } else if (type === "shape") {
    if (prev) ctx.drawImage(prev, 0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, Math.max(W, H) * (0.08 + 0.92 * t), 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(curr, 0, 0, W, H);
    ctx.restore();
  } else {
    if (prev) ctx.drawImage(prev, 0, 0, W, H);
    ctx.globalAlpha = t;
    ctx.drawImage(curr, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function exportHtml() {
  const html = buildPowerPointHtml();
  const titles = state.pages.map((page) => page.name || "");
  const title = escapeHtml(state.projectName || "Design");
  const total = state.pages.length;
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    body { margin: 0; background: #111827; color: #e5e7eb; font-family: Inter, Arial, sans-serif; }
    .deck { width: min(96vw, 1200px); margin: 20px auto; aspect-ratio: 16/9; overflow: hidden; background: #fff; box-shadow: 0 24px 70px rgba(0,0,0,.45); }
    .deck section { transform-origin: 0 0; }
    .controls { position: fixed; left: 50%; bottom: 18px; translate: -50% 0; display: flex; gap: 10px; align-items: center; background: rgba(17,24,39,.85); padding: 8px 14px; border-radius: 12px; }
    .controls button { border: 0; border-radius: 8px; background: #8b3dff; color: #fff; padding: 9px 16px; font-weight: 800; cursor: pointer; }
    .counter { color: #9aa3b2; font-size: 13px; min-width: 60px; text-align: center; }
    @media print {
      .controls { display: none; }
      .deck { width: 960px; margin: 0; box-shadow: none; }
      .deck section { display: block !important; page-break-after: always; }
    }
  </style></head><body>
    <div class="deck" id="deck"></div>
    <div class="controls"><button id="prev">Prev</button><span class="counter" id="counter">1 / ${total}</span><button id="next">Next</button></div>
    <script>
      const slidesHtml = ${JSON.stringify(html)};
      const titles = ${JSON.stringify(titles)};
      const parser = new DOMParser();
      const slides = Array.from(parser.parseFromString(slidesHtml, "text/html").body.children);
      const deck = document.getElementById("deck");
      const counter = document.getElementById("counter");
      let index = 0;
      function show() {
        deck.innerHTML = "";
        const node = slides[index].cloneNode(true);
        const scale = deck.clientWidth / 960;
        node.style.transform = "scale(" + scale + ")";
        deck.appendChild(node);
        counter.textContent = (index + 1) + " / " + slides.length;
        document.title = titles[index] ? (index + 1) + " — " + titles[index] : (index + 1) + " / " + slides.length;
      }
      function next() { index = Math.min(slides.length - 1, index + 1); show(); }
      function prev() { index = Math.max(0, index - 1); show(); }
      document.getElementById("prev").onclick = prev;
      document.getElementById("next").onclick = next;
      addEventListener("resize", show);
      addEventListener("keydown", function (e) {
        if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].indexOf(e.key) >= 0) { e.preventDefault(); next(); }
        else if (["ArrowLeft", "ArrowUp", "PageUp"].indexOf(e.key) >= 0) { e.preventDefault(); prev(); }
        else if (e.key === "Home") { index = 0; show(); }
        else if (e.key === "End") { index = slides.length - 1; show(); }
      });
      show();
    </script>
  </body></html>`;
  download("design.html", doc, "text/html");
}

function download(filename, content, type) {
  downloadBlob(filename, new Blob([content], { type }));
}

function downloadBlob(filename, blob) {
  if (!blob) return;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 1000);
}

function saveCurrentProject(kind = "Presentation", openProjects = true) {
  const snapshot = {
    id: crypto.randomUUID(),
    name: state.projectName || "Untitled design",
    kind,
    savedAt: new Date().toISOString(),
    pages: JSON.parse(JSON.stringify(state.pages)),
  };
  state.projects = [snapshot, ...state.projects.filter((project) => project.name !== snapshot.name)].slice(0, 24);
  persistProjects();
  if (openProjects) state.tool = "projects";
  render();
}

function loadProject(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return;
  state.projectName = project.name;
  state.pages = JSON.parse(JSON.stringify(project.pages));
  state.pageIndex = 0;
  state.selectedId = null;
  state.selectedIds = [];
  state.tool = project.kind === "AI PPT" || project.kind === "Presentation" ? "ppt" : "text";
  state.history = [];
  state.future = [];
  render();
}

function saveAsTemplate() {
  const name = prompt("Template name:", state.projectName || "My Template");
  if (!name) return;
  const category = prompt("Category (presentation, social, poster, business, education, personal):", "presentation");
  const tags = prompt("Tags (comma-separated):", "ai-generated").split(",").map(t => t.trim()).filter(Boolean);
  const template = {
    id: crypto.randomUUID(),
    name,
    category: category || "presentation",
    tags,
    pages: JSON.parse(JSON.stringify(state.pages)),
    thumb: generateTemplateThumb(state.pages),
    createdAt: new Date().toISOString(),
    userCreated: true,
    useCount: 0,
  };
  state.templates = [template, ...state.templates];
  persistTemplates();
  update({ tool: "marketplace", marketplaceCategory: template.category, marketplaceSort: "newest" }, false);
  state.aiStatus = `Template "${name}" saved!`;
  render();
}

function useTemplate() {
  const templateId = event?.target?.closest("[data-template-id]")?.dataset?.templateId;
  if (!templateId) return;
  const template = state.templates.find(t => t.id === templateId);
  if (!template) return;
  template.useCount = (template.useCount || 0) + 1;
  persistTemplates();
  state.projectName = template.name;
  state.pages = JSON.parse(JSON.stringify(template.pages));
  state.pageIndex = 0;
  state.selectedId = null;
  state.selectedIds = [];
  state.history = [];
  state.future = [];
  state.activeTemplateId = template.id;
  state.tool = "ppt";
  render();
  state.aiStatus = `Loaded template "${template.name}"`;
}

function deleteTemplate() {
  const templateId = event?.target?.closest("[data-template-id]")?.dataset?.templateId;
  if (!templateId) return;
  const template = state.templates.find(t => t.id === templateId);
  if (!template || !template.userCreated) return;
  if (!confirm(`Delete template "${template.name}"?`)) return;
  state.templates = state.templates.filter(t => t.id !== templateId);
  persistTemplates();
  render();
}

function setMarketplaceCategory() {
  const cat = event?.target?.value;
  update({ marketplaceCategory: cat || null }, false);
}

function setMarketplaceSort() {
  const sort = event?.target?.value;
  update({ marketplaceSort: sort || "newest" }, false);
}

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem("studio-projects") || "[]");
  } catch {
    return [];
  }
}

function persistProjects() {
  localStorage.setItem("studio-projects", JSON.stringify(state.projects));
}

function loadModelConfigs() {
  try {
    return JSON.parse(localStorage.getItem("studio-model-configs") || "[]");
  } catch {
    return [];
  }
}

function persistModelConfigs() {
  localStorage.setItem("studio-model-configs", JSON.stringify(state.modelConfigs));
  localStorage.setItem("studio-active-model-id", state.activeModelId || "");
}

function loadTemplates() {
  try {
    return JSON.parse(localStorage.getItem("studio-templates") || "[]");
  } catch {
    return [];
  }
}

function persistTemplates() {
  localStorage.setItem("studio-templates", JSON.stringify(state.templates));
}

function loadBrandKit() {
  try {
    const saved = JSON.parse(localStorage.getItem("studio-brand-kit") || "null");
    if (!saved) return defaultBrandKit();
    return { ...defaultBrandKit(), ...saved };
  } catch {
    return defaultBrandKit();
  }
}

function defaultBrandKit() {
  return {
    logo: null,           // base64 data URL or null
    logoWidth: 120,
    logoHeight: 40,
    primaryFont: "Inter",     // heading font
    secondaryFont: "Inter",   // body font
    lockedColors: {           // locked brand palette
      primary: "#2563eb",
      secondary: "#64748b",
      accent: "#f59e0b",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#1e293b",
      textMuted: "#64748b",
    },
    colorLockEnabled: false,  // when true, color picker only shows locked colors
    fontLockEnabled: false,   // when true, font picker only shows brand fonts
  };
}

function persistBrandKit() {
  localStorage.setItem("studio-brand-kit", JSON.stringify(state.brandKit));
}

function updateBrandKit(patch, replace = false) {
  state.brandKit = replace ? { ...defaultBrandKit(), ...patch } : { ...defaultBrandKit(), ...state.brandKit, ...patch };
  persistBrandKit();
  render();
}

function handleBrandLogoUpload(input) {
  const file = input?.files?.[0];
  input.value = "";
  if (!file) return;
  if (!/image\/(png|svg\+xml)|\.svg$/i.test(file.type || file.name)) {
    return alert("Please upload a PNG or SVG logo.");
  }
  if (file.size > 200 * 1024) return alert("Logo too large — max 200KB.");
  const reader = new FileReader();
  reader.onload = () => updateBrandKit({ logo: reader.result });
  reader.readAsDataURL(file);
}

function applyBrandKit() {
  const bk = state.brandKit || defaultBrandKit();
  commit(() => {
    state.pages.forEach((page) => {
      page.background = bk.lockedColors.background || page.background;
      page.elements.forEach((el) => {
        if (el.type === "text") {
          el.fontFamily = (el.fontWeight || 400) >= 700 ? bk.primaryFont : bk.secondaryFont;
        }
      });
    });
  });
  state.aiStatus = `Brand kit applied to ${state.pages.length} slides`;
}

function magicRestyle() {
  const bk = state.brandKit || defaultBrandKit();
  commit(() => {
    state.pages = restyleDeckToBrand(state.pages, bk);
    state.selectedId = null;
    state.selectedIds = [];
  });
  state.aiStatus = `Magic Restyle: brand kit applied to ${state.pages.length} slides`;
}

function exportBrandKitJson(scope = "kit") {
  const bk = state.brandKit || defaultBrandKit();
  downloadJson(`studio-brand-${scope}.json`, scope === "palette" ? bk.lockedColors : bk);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importBrandKitJson() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        updateBrandKit(data, true);
        state.aiStatus = "Brand kit imported";
      } catch {
        alert("Invalid brand kit JSON file.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function generateTemplateThumb(pages) {
  // Generate a simple SVG thumbnail from the first page
  const page = pages[0] || { elements: [], background: "#f8fafc" };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" viewBox="0 0 160 90">
    <rect width="160" height="90" fill="${page.background.startsWith("#") ? page.background : "#f8fafc"}"/>
    ${page.elements.slice(0, 8).map(el => {
      if (el.type === "text") return `<text x="${el.x * 0.166}" y="${el.y * 0.166 + 8}" font-size="${el.fontSize * 0.166}" fill="${el.color}">${escapeXml(el.text.slice(0, 30))}</text>`;
      if (el.type === "image") return `<rect x="${el.x * 0.166}" y="${el.y * 0.166}" width="${el.w * 0.166}" height="${el.h * 0.166}" fill="#ccc"/>`;
      if (el.type === "shapeAsset" || ["rect","circle","triangle","badge","pill"].includes(el.type)) return `<rect x="${el.x * 0.166}" y="${el.y * 0.166}" width="${el.w * 0.166}" height="${el.h * 0.166}" fill="${el.fill}" opacity="${el.opacity || 1}"/>`;
      return "";
    }).join("")}
  </svg>`;
}

function escapeXml(str) {
  return String(str).replace(/[&<>\"']/g, c => {
    if (c === '&') return '&';
    if (c === '<') return '<';
    if (c === '>') return '>';
    if (c === '"') return '"';
    if (c === "'") return '&apos;';
    return c;
  });
}

function makeModelDraft() {
  const provider = modelProviders.z_ai;
  return {
    provider: "z_ai",
    modelId: "",
    displayName: "",
    apiKey: "",
    protocol: provider.protocol,
    baseUrl: provider.baseUrl,
    lastTest: "",
  };
}

function sanitizeModelConfig(config) {
  const provider = modelProviders[config?.provider] || modelProviders.custom;
  return {
    id: config?.id || "",
    provider: config?.provider || "custom",
    modelId: String(config?.modelId || "").trim(),
    displayName: String(config?.displayName || config?.modelId || "").trim(),
    apiKey: String(config?.apiKey || "").trim(),
    protocol: config?.protocol || provider.protocol,
    baseUrl: String(config?.baseUrl || provider.baseUrl || "").trim().replace(/\/+$/, ""),
    lastTest: config?.lastTest || "",
    lastError: config?.lastError || "",
  };
}

function getActiveModel() {
  return state.modelConfigs.find((model) => model.id === state.activeModelId) || null;
}

function providerLabel(providerId) {
  return (modelProviders[providerId] || modelProviders.custom).label;
}

async function callConfiguredModel(modelConfig, messages, options = {}) {
  const model = sanitizeModelConfig(modelConfig);
  if (!model.modelId || !model.baseUrl) return { ok: false, error: "Model ID aur Base URL required hain" };
  // Resolve proxy URL — works both from http://localhost:5173 and file://
  const proxyBase = (location.protocol === "http:" || location.protocol === "https:")
    ? ""
    : "http://127.0.0.1:5173";
  try {
    const response = await fetch(`${proxyBase}/api/model-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        maxTokens: options.maxTokens || 1200,
        json: Boolean(options.json),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 404) return directConfiguredModelCall(model, messages, options);
    if (!response.ok || !data.ok) return { ok: false, error: data.error || `HTTP ${response.status}` };
    return { ok: true, content: data.content || "" };
  } catch (error) {
    // Server not running — fall back to direct browser call
    return directConfiguredModelCall(model, messages, options);
  }
}

async function directConfiguredModelCall(model, messages, options = {}) {
  try {
    const response = await fetch(chatCompletionsEndpoint(model.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(model.apiKey ? { Authorization: `Bearer ${model.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model.modelId,
        messages,
        temperature: 0.72,
        max_tokens: options.maxTokens || 1200,
        // Only send response_format for models that support it (not deepseek flash variants)
        ...(options.json && !model.modelId?.toLowerCase().includes("flash") && !model.modelId?.toLowerCase().includes("deepseek-v4") ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error?.message || data.message || `HTTP ${response.status}` };
    return { ok: true, content: data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "" };
  } catch (error) {
    return { ok: false, error: `${error.message || "Request failed"}; run through server.js if the provider blocks browser CORS` };
  }
}

function chatCompletionsEndpoint(baseUrl) {
  const clean = String(baseUrl || "").replace(/\/+$/, "");
  return clean.endsWith("/chat/completions") ? clean : `${clean}/chat/completions`;
}

function parseAiJson(content) {
  const raw = String(content || "").trim();
  // Strip markdown fences — handles ```json ... ``` and ``` ... ```
  let cleaned = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
  // Some models wrap in <json>...</json> or [JSON]: ...
  cleaned = cleaned.replace(/^(?:<json>|json:|JSON:|json\s*=\s*)/i, "").replace(/<\/json>$/i, "").trim();
  // Find outermost { ... }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) {
    // Last resort: try parsing whole string
    try { return JSON.parse(cleaned); } catch {}
    throw new Error("JSON object not found in model response");
  }
  const slice = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    // Attempt basic repair: remove trailing commas, fix unquoted keys
    const repaired = slice
      .replace(/,\s*([}\]])/g, "$1")           // trailing commas
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":'); // unquoted keys
    return JSON.parse(repaired);
  }
}

function chooseAiDeckTheme(deck, topic, tone) {
  const haystack = `${topic} ${tone} ${deck.templateMood || ""} ${(deck.visualKeywords || []).join(" ")}`.toLowerCase();
  const scored = showcasePresentationTemplates.map((template) => {
    const textValue = `${template.name} ${template.sub} ${template.preview}`.toLowerCase();
    let score = 0;
    haystack.split(/\s+/).forEach((word) => {
      if (word.length > 3 && textValue.includes(word)) score += 2;
    });
    if (/agri|farm|crop|rice|organic/.test(haystack) && /agri|farm|rice|cultivated|farmer/.test(textValue)) score += 8;
    if (/robot|ai|tech|automation|software|app|model/.test(haystack) && /robot|tech|automation|business/.test(textValue)) score += 8;
    if (/business|pitch|startup|market|sales|finance/.test(haystack) && /business|pitch|project|startup/.test(textValue)) score += 5;
    return { template, score };
  }).sort((a, b) => b.score - a.score);
  const template = scored[0]?.score > 0 ? scored[0].template : showcasePresentationTemplates[9];
  const palette = paletteFromHint(deck.paletteHint, template.palette);
  const dark = ["dark", "technology"].includes(String(deck.paletteHint || deck.templateMood || "").toLowerCase()) || palette[0] === "#05080f";
  const photoSet = topicPhotoSet(haystack, template);
  const family = aiTemplateFamily(haystack, template);
  return {
    template,
    templateName: template.name,
    family,
    palette,
    photos: photoSet,
    photo: photoSet[0] || template.photo || photos[0],
    dark,
    muted: dark ? "#b8c2d0" : "#64748b",
  };
}

function aiTemplateFamily(haystack, template) {
  if (/agri|farm|farmer|crop|soil|irrigation|harvest|kisan/.test(haystack)) return "agriculture-photo";
  // Electric vehicles, cars, transport → bold dark-tech with EV photos
  if (/electric|ev\b|vehicle|car\b|auto|transport|motor|tesla|battery.*car|byd|charging/.test(haystack)) return "dark-tech";
  if (/robot|ai\b|tech|automation|software|app\b|data|digital|cyber|computer/.test(haystack)) return "dark-tech";
  if (/climate|solar|wind|energy|environment|green|renewable|sustainable/.test(haystack)) return "editorial-split";
  if (/health|medical|hospital|doctor|medicine|pharma/.test(haystack)) return "editorial-split";
  if (/business|finance|sales|market|startup|strategy|report|invest/.test(haystack)) return "clean-business";
  if (/education|school|student|teacher|learn|university/.test(haystack)) return "clean-business";
  if (template.layout === "photo" || template.preview?.includes("photo")) return "editorial-split";
  if (template.layout === "clean" || template.layout === "dashboard") return "clean-business";
  if (template.layout === "split") return "editorial-split";
  // Default: use elegant showcase for broad topics (gives beautiful full-bleed covers)
  return "showcase";
}

function topicPhotoSet(haystack, template) {
  if (/agri|farm|farmer|crop|soil|irrigation|harvest|kisan/.test(haystack)) {
    return [showcasePhotos.fields, showcasePhotos.crops, showcasePhotos.farm, showcasePhotos.leaves, photos[17]].filter(Boolean);
  }
  // Electric vehicle / automotive
  if (/electric.*car|ev.*car|car.*electric|electric vehicle/.test(haystack)) {
    return [showcasePhotos.ev, showcasePhotos.evCharging, showcasePhotos.evRoad, showcasePhotos.car, showcasePhotos.carNight].filter(Boolean);
  }
  if (/\bcar\b|vehicle|automobile|automotive|motor|transport|tesla|byd/.test(haystack)) {
    return [showcasePhotos.car, showcasePhotos.ev, showcasePhotos.evRoad, showcasePhotos.carNight, showcasePhotos.evCharging].filter(Boolean);
  }
  // Technology / AI / Robotics
  if (/robot|ai\b|tech|automation|software|app\b|data|digital|cyber|computer/.test(haystack)) {
    return [showcasePhotos.robot, showcasePhotos.circuit, showcasePhotos.robotics, photos[88]].filter(Boolean);
  }
  // Climate / Green energy
  if (/climate|solar|wind|energy|environment|green|renewable|sustainable/.test(haystack)) {
    return [showcasePhotos.solar, showcasePhotos.wind, showcasePhotos.climate, showcasePhotos.fields].filter(Boolean);
  }
  // Health / Medical
  if (/health|medical|hospital|doctor|medicine|pharma|nurse/.test(haystack)) {
    return [showcasePhotos.health, showcasePhotos.medical, photos[20]].filter(Boolean);
  }
  // Education
  if (/education|school|student|teacher|learn|university|college/.test(haystack)) {
    return [showcasePhotos.education, showcasePhotos.classroom, photos[15]].filter(Boolean);
  }
  // Space
  if (/space|nasa|galaxy|planet|cosmos|satellite|rocket|astronomy/.test(haystack)) {
    return [showcasePhotos.space, showcasePhotos.science, photos[0]].filter(Boolean);
  }
  // Sports
  if (/sport|fitness|yoga|exercise|athlete|game|football|cricket|basketball/.test(haystack)) {
    return [showcasePhotos.sports, photos[4], photos[5]].filter(Boolean);
  }
  // Food
  if (/food|restaurant|recipe|nutrition|cuisine|chef|cooking/.test(haystack)) {
    return [showcasePhotos.food, photos[31], photos[33], photos[34], photos[36]].filter(Boolean);
  }
  // Finance / Business
  if (/finance|money|revenue|sales|market|business|startup|invest/.test(haystack)) {
    return [showcasePhotos.finance, showcasePhotos.business, photos[20], photos[21], photos[24]].filter(Boolean);
  }
  // Travel
  if (/travel|tourism|destination|trip|vacation|country/.test(haystack)) {
    return [showcasePhotos.travel, photos[11], photos[12], photos[14]].filter(Boolean);
  }
  return [template.photo, showcasePhotos.abstract, showcasePhotos.gradient, photos[0], photos[3]].filter(Boolean);
}

function paletteFromHint(hint, fallback) {
  const key = String(hint || "").toLowerCase();
  // ink = dark bg, paper = light bg, accent = primary color, pop = secondary/heading accent
  // ink must be vivid brand color (not near-black) so slides look "branded" not "dark mode"
  const palettes = {
    blue:    ["#1a237e", "#f0f6ff", "#2563eb", "#f5c518"],  // deep navy, bright blue, gold
    green:   ["#1b5e20", "#f0fdf4", "#22c55e", "#fbbf24"],  // forest green, lime, amber
    orange:  ["#7c2d12", "#fff7ed", "#f97316", "#facc15"],  // deep orange, amber
    purple:  ["#3b0764", "#faf5ff", "#a855f7", "#f472b6"],  // deep purple, violet, pink
    neutral: ["#1e293b", "#f8fafc", "#3b82f6", "#e5e7eb"],  // slate, blue, light
    dark:    ["#0d1117", "#f8fafc", "#6366f1", "#22d3ee"],   // near-black, indigo, cyan
    red:     ["#7f1d1d", "#fff5f5", "#ef4444", "#fb923c"],  // deep red, orange
    teal:    ["#134e4a", "#f0fdfa", "#14b8a6", "#60a5fa"],  // teal, blue
  };
  return palettes[key] || fallback || palettes["blue"];
}

function commit(fn) {
  saveHistory();
  fn();
  state.future = [];
  render();
  pushCollabState();
}

function saveHistory() {
  state.history.push(JSON.stringify({ pages: state.pages, pageIndex: state.pageIndex }));
  if (state.history.length > 40) state.history.shift();
}

function undo() {
  if (!state.history.length) return;
  state.future.push(JSON.stringify({ pages: state.pages, pageIndex: state.pageIndex }));
  restoreSnapshot(state.history.pop());
}

function redo() {
  if (!state.future.length) return;
  state.history.push(JSON.stringify({ pages: state.pages, pageIndex: state.pageIndex }));
  restoreSnapshot(state.future.pop());
}

function restoreSnapshot(snapshot) {
  const parsed = JSON.parse(snapshot);
  state.pages = parsed.pages;
  state.pageIndex = parsed.pageIndex;
  state.selectedId = null;
  state.selectedIds = [];
  state.textBoxMode = false;
  render();
  pushCollabState();
}

function update(patch) {
  state = { ...state, ...patch };
  render();
}

function getPage() {
  return state.pages[state.pageIndex];
}

function getSelected() {
  return getPage().elements.find((el) => el.id === state.selectedId);
}

function getSelectedIds() {
  const pageIds = new Set(getPage().elements.map((el) => el.id));
  const ids = (state.selectedIds || []).filter((id) => pageIds.has(id));
  if (ids.length) return ids;
  return state.selectedId && pageIds.has(state.selectedId) ? [state.selectedId] : [];
}

function getSelectedElements() {
  const ids = new Set(getSelectedIds());
  return getPage().elements.filter((el) => ids.has(el.id));
}

function isSelected(el) {
  return getSelectedIds().includes(el.id);
}

function makeBlankPage(name) {
  return { id: crypto.randomUUID(), name, background: "#f8fafc", elements: [] };
}

function text(x, y, w, h, value, fontSize, fontWeight, color) {
  return { id: crypto.randomUUID(), type: "text", x, y, w, h, text: value, fontSize, fontWeight, color, fontFamily: "Inter" };
}

function shape(type, x, y, w, h, fill, opacity = 1) {
  return { id: crypto.randomUUID(), type, x, y, w, h, fill, opacity };
}

function image(x, y, w, h, src) {
  return { id: crypto.randomUUID(), type: "image", x, y, w, h, src };
}

function makeIconAssets() {
  const names = [
    "Sun", "Cloud", "Umbrella", "Snowman", "Comet", "Phone", "Check Box", "Umbrella Rain", "Coffee", "Pointer", "Skull", "Radioactive", "Biohazard", "Peace", "Yin Yang", "Wheel", "Frown", "Smile", "Female", "Male",
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces", "Spade", "Club", "Heart", "Diamond", "Hot Springs", "Recycle", "Wheelchair", "Anchor",
    "Warning", "Voltage", "White Circle", "Black Circle", "Soccer", "Baseball", "Snowman Outline", "Cloud Lightning", "Sun Rays", "Moon", "Star", "Circle Star", "Telephone", "Ballot Box", "Check Mark", "Cross Mark",
    "Outlined Cross", "Maltese Cross", "Star Cross", "Sparkle", "Eight Spoke", "Eight Point", "Flower", "Music Note", "Notes", "Recycle Bold", "Infinity", "Triangle Up", "Triangle Down", "Black Square", "White Square",
    "Play", "Pause", "Stop", "Record", "Fast Forward", "Rewind", "Up Button", "Down Button", "Left Button", "Right Button", "Circle Dot", "Bullseye", "Diamond Outline", "Lozenge", "Square Dot", "Circle Ring",
    "Scissors", "Airplane", "Envelope", "Pencil", "Nib", "Check", "Ballot Check", "Heavy Cross", "Latin Cross", "Star David", "Sparkles", "Eight Star", "Eight Point Star", "Snowflake", "Sparkle Heavy", "Flower Heavy",
    "Arrow Right", "Arrow Left", "Arrow Up", "Arrow Down", "Arrow Both", "Arrow Up Down", "North West", "North East", "South East", "South West", "Return Left", "Return Right", "Curve Left", "Curve Right", "Refresh", "Loop",
    "Black Star", "White Star", "Circle", "Square", "Triangle", "Diamond", "Small Circle", "Large Circle", "Small Square", "Medium Square", "Black Diamond", "White Diamond", "Dotted Square", "Shadow Square", "Checkered", "Target",
  ];
  const curated = [
    ...range(0x2600, 0x26FF),
    ...range(0x2701, 0x27BF),
    ...range(0x2190, 0x21FF),
    ...range(0x25A0, 0x25FF),
  ];
  const blocked = new Set([0x2621, 0x2622, 0x2623, 0x2626, 0x262A, 0x262B, 0x262C, 0x262D, 0x262E, 0x262F, 0x2670, 0x2671, 0x2672, 0x2673, 0x2674, 0x2675, 0x2676, 0x2677, 0x2678, 0x2679, 0x267A, 0x267B]);
  const unique = curated.filter((code, index, list) => list.indexOf(code) === index && !blocked.has(code)).slice(0, 200);
  return unique.map((code, index) => ({
    code,
    name: names[index] || `Icon ${index + 1}`,
    group: index < 64 ? "symbols" : index < 112 ? "dingbats" : index < 160 ? "arrows" : "shapes",
  }));
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function iconEntity(code) {
  return `&#${Number(code) || 9632};`;
}

function makeShapeAssets() {
  const grids = [];
  for (let rows = 2; rows <= 7; rows += 1) {
    for (let cols = 2; cols <= 7; cols += 1) {
      grids.push({ id: `grid-${cols}x${rows}`, name: `Grid ${cols}x${rows}`, group: "Grids", kind: "grid", rows, cols });
    }
  }

  const lineStyles = ["solid", "dashed", "dotted", "double"];
  const lineEnds = [
    ["plain", "Line"],
    ["arrow-end", "Arrow"],
    ["arrow-start", "Back Arrow"],
    ["arrow-both", "Double Arrow"],
    ["dot-start-arrow-end", "Dot Arrow"],
    ["square-start-dash-end", "Anchor Dash"],
  ];
  const lines = lineStyles.flatMap((style) => lineEnds.map(([ends, label]) => ({
    id: `line-${style}-${ends}`,
    name: `${titleCase(style)} ${label}`,
    group: "Lines",
    kind: "line",
    lineStyle: style,
    ends,
    thickness: style === "double" ? 5 : style === "dotted" ? 4 : 3,
  })));
  const extraLines = Array.from({ length: 24 }, (_, index) => ({
    id: `line-accent-${index + 1}`,
    name: `Accent Line ${index + 1}`,
    group: "Lines",
    kind: "line",
    lineStyle: lineStyles[index % lineStyles.length],
    ends: lineEnds[index % lineEnds.length][0],
    thickness: 2 + (index % 5),
  }));

  const baseShapes = [
    ["square", "Square", "inset(0)", "0"],
    ["rounded", "Rounded Square", "inset(0)", "10px"],
    ["circle", "Circle", "circle(50% at 50% 50%)", "999px"],
    ["ellipse", "Oval", "ellipse(46% 50% at 50% 50%)", "999px"],
    ["star", "Star", "polygon(50% 2%,61% 35%,96% 35%,68% 55%,79% 90%,50% 68%,21% 90%,32% 55%,4% 35%,39% 35%)", "0"],
    ["triangle", "Triangle", "polygon(50% 0,100% 100%,0 100%)", "0"],
    ["triangle-right", "Right Triangle", "polygon(0 0,100% 50%,0 100%)", "0"],
    ["diamond", "Diamond", "polygon(50% 0,100% 50%,50% 100%,0 50%)", "0"],
    ["pentagon", "Pentagon", "polygon(50% 0,98% 35%,80% 100%,20% 100%,2% 35%)", "0"],
    ["hexagon", "Hexagon", "polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)", "0"],
    ["octagon", "Octagon", "polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)", "0"],
    ["shield", "Shield", "polygon(50% 0,94% 12%,88% 66%,50% 100%,12% 66%,6% 12%)", "0"],
    ["parallelogram", "Parallelogram", "polygon(20% 0,100% 0,80% 100%,0 100%)", "0"],
    ["trapezoid", "Trapezoid", "polygon(18% 0,82% 0,100% 100%,0 100%)", "0"],
    ["chevron", "Chevron", "polygon(0 0,70% 0,100% 50%,70% 100%,0 100%,30% 50%)", "0"],
    ["tag", "Tag", "polygon(0 0,78% 0,100% 50%,78% 100%,0 100%)", "0"],
    ["speech", "Speech Bubble", "polygon(0 0,100% 0,100% 76%,57% 76%,45% 100%,34% 76%,0 76%)", "8px"],
    ["cross", "Cross", "polygon(35% 0,65% 0,65% 35%,100% 35%,100% 65%,65% 65%,65% 100%,35% 100%,35% 65%,0 65%,0 35%,35% 35%)", "0"],
    ["spark", "Spark", "polygon(50% 0,60% 38%,100% 50%,60% 62%,50% 100%,40% 62%,0 50%,40% 38%)", "0"],
    ["step", "Steps", "polygon(0 72%,30% 72%,30% 48%,55% 48%,55% 25%,80% 25%,80% 0,100% 0,100% 100%,0 100%)", "0"],
  ];
  const blobRadii = ["55% 45% 52% 48% / 42% 60% 40% 58%", "62% 38% 46% 54% / 52% 36% 64% 48%", "44% 56% 61% 39% / 58% 44% 56% 42%", "50% 40% 58% 44% / 36% 60% 42% 64%"];
  const shapes = Array.from({ length: 128 }, (_, index) => {
    if (index >= 92) {
      return {
        id: `blob-${index - 91}`,
        name: `Blob ${index - 91}`,
        group: "Shapes",
        kind: "shape",
        radius: blobRadii[index % blobRadii.length],
        clip: "inset(0)",
      };
    }
    const [id, name, clip, radius] = baseShapes[index % baseShapes.length];
    const variant = Math.floor(index / baseShapes.length) + 1;
    return { id: `${id}-${variant}`, name: variant === 1 ? name : `${name} ${variant}`, group: "Shapes", kind: "shape", clip, radius };
  });

  return [...grids, ...lines, ...extraLines, ...shapes].slice(0, 200);
}

function getShapeAsset(id) {
  return shapeAssets.find((asset) => asset.id === id) || null;
}

function shapeAssetPreviewStyle(asset) {
  const element = { fill: "#c8c8c8", w: 68, h: 52 };
  return shapeAssetElementStyle(asset, element);
}

function shapeAssetPreviewInner(asset) {
  return shapeAssetElementInner(asset, { fill: "#c8c8c8", w: 68, h: 52 });
}

function shapeAssetElementStyle(asset, el, scale = 1) {
  const fill = el.fill || "#bfbfbf";
  if (asset.kind === "grid") {
    const cols = asset.cols || 3;
    const rows = asset.rows || 3;
    return `background-color:transparent;background-image:linear-gradient(${fill} 1px, transparent 1px),linear-gradient(90deg, ${fill} 1px, transparent 1px);background-size:${100 / cols}% ${100 / rows}%;border:${Math.max(1, 2 * scale)}px solid ${fill};`;
  }
  if (asset.kind === "line") {
    return `background:transparent;color:${fill};`;
  }
  return `background:${fill};clip-path:${asset.clip || "inset(0)"};border-radius:${asset.radius || "0"};`;
}

function shapeAssetElementInner(asset, el, scale = 1) {
  if (asset.kind !== "line") return "";
  const width = Math.max(1, (asset.thickness || 3) * scale);
  const style = asset.lineStyle === "double" ? "double" : asset.lineStyle || "solid";
  const dash = style === "dashed" ? "shape-line dashed" : style === "dotted" ? "shape-line dotted" : style === "double" ? "shape-line double" : "shape-line";
  return `<span class="${dash}" style="position:absolute;left:8px;right:8px;top:50%;transform:translateY(-50%);border-top:${width}px ${style} currentColor"></span>${shapeLineEnd(asset.ends, "start")}${shapeLineEnd(asset.ends, "end")}`;
}

function shapeLineEnd(ends = "", side) {
  const hasArrow = ends.includes(side === "start" ? "arrow-start" : "arrow-end") || ends === "arrow-both";
  const hasDot = ends.includes(`${side === "start" ? "dot-start" : "dot-end"}`);
  const hasSquare = ends.includes(`${side === "start" ? "square-start" : "square-end"}`);
  const hasDash = ends.includes(`${side === "start" ? "dash-start" : "dash-end"}`);
  const pos = `position:absolute;${side === "start" ? "left:2px;" : "right:2px;"}top:50%;transform:translateY(-50%);`;
  if (hasArrow) return `<span class="shape-line-end ${side} arrow" style="${pos}width:0;height:0;border-top:7px solid transparent;border-bottom:7px solid transparent;${side === "start" ? "border-right:13px solid currentColor;" : "border-left:13px solid currentColor;"}"></span>`;
  if (hasDot) return `<span class="shape-line-end ${side} dot" style="${pos}width:12px;height:12px;border-radius:999px;background:currentColor;"></span>`;
  if (hasSquare || hasDash) return `<span class="shape-line-end ${side} square" style="${pos}width:12px;height:12px;background:currentColor;"></span>`;
  return "";
}

function shapeAssetToSvg(el, opacity, rotate) {
  const asset = getShapeAsset(el.shapeId);
  const fill = xmlAttr(el.fill || "#bfbfbf");
  if (!asset) return "";
  if (asset.kind === "line") {
    const dash = asset.lineStyle === "dashed" ? ' stroke-dasharray="18 12"' : asset.lineStyle === "dotted" ? ' stroke-dasharray="2 12" stroke-linecap="round"' : "";
    return `<line x1="${el.x}" y1="${el.y + el.h / 2}" x2="${el.x + el.w}" y2="${el.y + el.h / 2}" stroke="${fill}" stroke-width="${asset.thickness || 3}" opacity="${opacity}"${dash}${rotate}/>`;
  }
  if (asset.kind === "grid") {
    const cols = asset.cols || 3;
    const rows = asset.rows || 3;
    const lines = [];
    for (let col = 0; col <= cols; col += 1) lines.push(`<line x1="${el.x + (el.w / cols) * col}" y1="${el.y}" x2="${el.x + (el.w / cols) * col}" y2="${el.y + el.h}" stroke="${fill}" stroke-width="2"/>`);
    for (let row = 0; row <= rows; row += 1) lines.push(`<line x1="${el.x}" y1="${el.y + (el.h / rows) * row}" x2="${el.x + el.w}" y2="${el.y + (el.h / rows) * row}" stroke="${fill}" stroke-width="2"/>`);
    return `<g opacity="${opacity}"${rotate}>${lines.join("")}</g>`;
  }
  if (asset.clip?.startsWith("polygon(")) {
    const points = asset.clip.slice(8, -1).split(",").map((point) => {
      const [px, py] = point.trim().split(/\s+/).map((value) => parseFloat(value) / 100);
      return `${el.x + el.w * px},${el.y + el.h * py}`;
    }).join(" ");
    return `<polygon points="${points}" fill="${fill}" opacity="${opacity}"${rotate}/>`;
  }
  if (asset.radius === "999px" || asset.clip?.startsWith("circle") || asset.clip?.startsWith("ellipse")) return `<ellipse cx="${el.x + el.w / 2}" cy="${el.y + el.h / 2}" rx="${el.w / 2}" ry="${el.h / 2}" fill="${fill}" opacity="${opacity}"${rotate}/>`;
  return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" rx="18" fill="${fill}" opacity="${opacity}"${rotate}/>`;
}

function pageBackground(page) {
  return page.background.startsWith("linear-gradient") ? `background:${page.background}` : `background:${page.background}`;
}

function layerName(el) {
  if (el.type === "text") return el.text.slice(0, 28) || "Text";
  if (el.type === "image") return "Photo";
  if (el.type === "icon") return el.name || "Icon";
  if (el.type === "shapeAsset") return el.name || "Shape";
  return el.type.charAt(0).toUpperCase() + el.type.slice(1);
}

function galleryTitle(template) {
  if (template.storyFeatured || template.socialSection || template.businessFeatured || template.invitationFeatured) return template.name;
  const byLayout = {
    split: `${template.name} Deck`,
    poster: template.name.toUpperCase(),
    clean: `${template.name} Pitch Deck`,
    photo: `${template.name} Report`,
    dashboard: `${template.name} Management`,
  };
  return byLayout[template.layout] || template.name;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function titleCase(value) {
  return String(value)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

document.addEventListener("keydown", handleKeyboard);
document.addEventListener("copy", handleCopy);
document.addEventListener("paste", handlePaste);
window.addEventListener("message", handlePresenterMessage);

// Live-presence: broadcast pointer + keep awareness fresh while collab is on
document.addEventListener("pointermove", (event) => {
  if (!state.collabEnabled || !state.collabClient) return;
  const slide = document.querySelector("[data-slide]");
  if (!slide) return;
  const now = performance.now();
  if (now - (state._lastPointerSend || 0) < 90) return;
  state._lastPointerSend = now;
  const point = slidePoint(event, slide);
  const client = state.collabClient;
  client.setAwareness({ pageIndex: state.pageIndex, selection: getSelectedIds(), pointer: { x: point.x, y: point.y } });
  const overlay = document.querySelector("[data-remote-cursors]");
  if (overlay && state.collabPeers.length) overlay.innerHTML = renderRemoteCursorNodes();
});
document.addEventListener("pointerleave", (event) => {
  if (!state.collabEnabled || !state.collabClient) return;
  if (event.target instanceof Element && event.target.closest?.(".slide")) {
    state.collabClient.setAwareness({ pageIndex: state.pageIndex, selection: getSelectedIds(), pointer: null });
  }
});
setInterval(() => {
  const client = state.collabClient;
  if (!state.collabEnabled || !client) return;
  if (!client.connected) {
    if (state.collabPeers.length) update({ collabPeers: [] }, false);
    return;
  }
  pushCollabPresence();
}, 20000);

render();

