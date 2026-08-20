// dataset.registry.js
// سجل مصادر البيانات لكل كلية/شطر (بنين - بنات)

const KFU_COLLEGES = [
  { id: 'agri-food', name: 'كلية العلوم الزراعية والأغذية' },
  { id: 'education', name: 'كلية التربية' },
  { id: 'science', name: 'كلية العلوم' },
  { id: 'arts', name: 'كلية الآداب' },
  { id: 'business', name: 'كلية إدارة الأعمال' },
  { id: 'engineering', name: 'كلية الهندسة' },
  { id: 'computer-it', name: 'كلية علوم الحاسب وتقنية المعلومات' },
  { id: 'medicine', name: 'كلية الطب' },
  { id: 'clinical-pharmacy', name: 'كلية الصيدلة الإكلينيكية' },
  { id: 'applied-medical', name: 'كلية العلوم الطبية التطبيقية' },
  { id: 'veterinary', name: 'كلية الطب البيطري' },
  { id: 'dentistry', name: 'كلية طب الأسنان' },
  { id: 'law', name: 'كلية الحقوق' },
  { id: 'public-health', name: 'كلية الصحة العامة' },
  { id: 'nursing', name: 'كلية التمريض' },
  { id: 'architecture-planning', name: 'كلية العمارة والتخطيط' }
];

const DATASET_OVERRIDES = {
  'agri-food:male': {
    enabled: true,
    files: {
      rooms: 'data/agri-food/male/rooms.js',
      doctors: 'data/agri-food/male/doctors.js',
      paths: 'data/agri-food/male/paths.rel.js'
    },
    maps: {
      floor1: 'assets/maps/map-1.png',
      floor2: 'assets/maps/map-2.png'
    },
    // أبعاد صورة الخريطة الأصلية التي حُسبت عليها كل الإحداثيات
    imageSize: { width: 901, height: 988 }
  }
};

/* الأبعاد الافتراضية لأي كلية لم تُحدَّد أبعادها صراحةً */
const DEFAULT_IMAGE_SIZE = { width: 901, height: 988 };

function buildCollegeDatasetEntries(college){
  const audiences = [
    { key: 'male', label: 'بنين' },
    { key: 'female', label: 'بنات' }
  ];

  return audiences.map(audience => {
    const key = `${college.id}:${audience.key}`;
    const override = DATASET_OVERRIDES[key] || {};

    return {
      key,
      collegeId: college.id,
      collegeName: college.name,
      audience: audience.key,
      audienceName: audience.label,
      enabled: Boolean(override.enabled),
      files: override.files || {
        rooms: `data/${college.id}/${audience.key}/rooms.js`,
        doctors: `data/${college.id}/${audience.key}/doctors.js`,
        paths: `data/${college.id}/${audience.key}/paths.rel.js`
      },
      maps: override.maps || {
        floor1: `data/${college.id}/${audience.key}/map-1.png`,
        floor2: `data/${college.id}/${audience.key}/map-2.png`
      },
      imageSize: override.imageSize || { ...DEFAULT_IMAGE_SIZE }
    };
  });
}

window.datasetRegistry = KFU_COLLEGES.flatMap(buildCollegeDatasetEntries);
