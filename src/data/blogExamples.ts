import type { ErmDocument, ErmEdge, ErmNode, LanguageCode } from '../model/types.ts';

export type BlogExampleKey =
  | 'school'
  | 'shop'
  | 'library'
  | 'hospital'
  | 'hotel'
  | 'university'
  | 'cinema'
  | 'sports'
  | 'rental'
  | 'music';

interface ExampleSpec {
  key: BlogExampleKey;
  de: {
    name: string;
    e1: string;
    e1Pk: string;
    e1Attr: string;
    rel: string;
    relAttr?: string;
    e2: string;
    e2Pk: string;
    e2Attr: string;
    card1: '1' | 'n' | 'm';
    card2: '1' | 'n' | 'm';
    e2Weak?: boolean;
    relIdentifying?: boolean;
  };
  en: {
    name: string;
    e1: string;
    e1Pk: string;
    e1Attr: string;
    rel: string;
    relAttr?: string;
    e2: string;
    e2Pk: string;
    e2Attr: string;
    card1: '1' | 'n' | 'm';
    card2: '1' | 'n' | 'm';
    e2Weak?: boolean;
    relIdentifying?: boolean;
  };
}

const SPECS: Record<BlogExampleKey, ExampleSpec> = {
  school: {
    key: 'school',
    de: {
      name: 'Schule_Kurswahl',
      e1: 'Schüler',
      e1Pk: 'schueler_id',
      e1Attr: 'name',
      rel: 'besucht',
      relAttr: 'note',
      e2: 'Kurs',
      e2Pk: 'kurs_id',
      e2Attr: 'fach',
      card1: 'n',
      card2: 'm',
    },
    en: {
      name: 'School_Courses',
      e1: 'Student',
      e1Pk: 'student_id',
      e1Attr: 'name',
      rel: 'attends',
      relAttr: 'grade',
      e2: 'Course',
      e2Pk: 'course_id',
      e2Attr: 'subject',
      card1: 'n',
      card2: 'm',
    },
  },
  shop: {
    key: 'shop',
    de: {
      name: 'Onlineshop_Bestellung',
      e1: 'Kunde',
      e1Pk: 'kunden_id',
      e1Attr: 'email',
      rel: 'gibt auf',
      relAttr: 'datum',
      e2: 'Bestellung',
      e2Pk: 'bestell_id',
      e2Attr: 'gesamtpreis',
      card1: '1',
      card2: 'n',
    },
    en: {
      name: 'OnlineShop_Orders',
      e1: 'Customer',
      e1Pk: 'customer_id',
      e1Attr: 'email',
      rel: 'places',
      relAttr: 'order_date',
      e2: 'Order',
      e2Pk: 'order_id',
      e2Attr: 'total_price',
      card1: '1',
      card2: 'n',
    },
  },
  library: {
    key: 'library',
    de: {
      name: 'Bibliothek_Ausleihe',
      e1: 'Leser',
      e1Pk: 'leser_nr',
      e1Attr: 'nachname',
      rel: 'leiht aus',
      relAttr: 'rueckgabe',
      e2: 'Buch',
      e2Pk: 'isbn',
      e2Attr: 'titel',
      card1: 'n',
      card2: 'm',
    },
    en: {
      name: 'Library_Loans',
      e1: 'Member',
      e1Pk: 'member_id',
      e1Attr: 'last_name',
      rel: 'borrows',
      relAttr: 'due_date',
      e2: 'Book',
      e2Pk: 'isbn',
      e2Attr: 'title',
      card1: 'n',
      card2: 'm',
    },
  },
  hospital: {
    key: 'hospital',
    de: {
      name: 'Klinik_Behandlung',
      e1: 'Arzt',
      e1Pk: 'arzt_id',
      e1Attr: 'fachgebiet',
      rel: 'behandelt',
      relAttr: 'diagnose',
      e2: 'Patient',
      e2Pk: 'patient_id',
      e2Attr: 'geburtsdatum',
      card1: 'n',
      card2: 'm',
    },
    en: {
      name: 'Hospital_Treatment',
      e1: 'Doctor',
      e1Pk: 'doctor_id',
      e1Attr: 'specialty',
      rel: 'treats',
      relAttr: 'diagnosis',
      e2: 'Patient',
      e2Pk: 'patient_id',
      e2Attr: 'birth_date',
      card1: 'n',
      card2: 'm',
    },
  },
  hotel: {
    key: 'hotel',
    de: {
      name: 'Hotel_Zimmer',
      e1: 'Hotel',
      e1Pk: 'hotel_id',
      e1Attr: 'stadt',
      rel: 'hat',
      e2: 'Zimmer',
      e2Pk: 'zimmer_nr',
      e2Attr: 'kategorie',
      card1: '1',
      card2: 'n',
      e2Weak: true,
      relIdentifying: true,
    },
    en: {
      name: 'Hotel_Rooms',
      e1: 'Hotel',
      e1Pk: 'hotel_id',
      e1Attr: 'city',
      rel: 'contains',
      e2: 'Room',
      e2Pk: 'room_no',
      e2Attr: 'category',
      card1: '1',
      card2: 'n',
      e2Weak: true,
      relIdentifying: true,
    },
  },
  university: {
    key: 'university',
    de: {
      name: 'Uni_Pruefung',
      e1: 'Studierender',
      e1Pk: 'matrikel_nr',
      e1Attr: 'studiengang',
      rel: 'schreibt',
      relAttr: 'punkte',
      e2: 'Klausur',
      e2Pk: 'klausur_id',
      e2Attr: 'modul',
      card1: 'n',
      card2: 'm',
    },
    en: {
      name: 'University_Exams',
      e1: 'Student',
      e1Pk: 'matriculation_no',
      e1Attr: 'major',
      rel: 'takes',
      relAttr: 'score',
      e2: 'Exam',
      e2Pk: 'exam_id',
      e2Attr: 'module',
      card1: 'n',
      card2: 'm',
    },
  },
  cinema: {
    key: 'cinema',
    de: {
      name: 'Kino_Vorstellung',
      e1: 'Film',
      e1Pk: 'film_id',
      e1Attr: 'titel',
      rel: 'läuft in',
      relAttr: 'uhrzeit',
      e2: 'Kinosaal',
      e2Pk: 'saal_nr',
      e2Attr: 'plaetze',
      card1: 'n',
      card2: 'm',
    },
    en: {
      name: 'Cinema_Screenings',
      e1: 'Movie',
      e1Pk: 'movie_id',
      e1Attr: 'title',
      rel: 'screens in',
      relAttr: 'showtime',
      e2: 'Auditorium',
      e2Pk: 'hall_no',
      e2Attr: 'seats',
      card1: 'n',
      card2: 'm',
    },
  },
  sports: {
    key: 'sports',
    de: {
      name: 'Verein_Kader',
      e1: 'Verein',
      e1Pk: 'verein_id',
      e1Attr: 'liga',
      rel: 'beschäftigt',
      e2: 'Spieler',
      e2Pk: 'spieler_id',
      e2Attr: 'position',
      card1: '1',
      card2: 'n',
    },
    en: {
      name: 'Club_Roster',
      e1: 'Club',
      e1Pk: 'club_id',
      e1Attr: 'league',
      rel: 'employs',
      e2: 'Player',
      e2Pk: 'player_id',
      e2Attr: 'position',
      card1: '1',
      card2: 'n',
    },
  },
  rental: {
    key: 'rental',
    de: {
      name: 'Autovermietung',
      e1: 'Kunde',
      e1Pk: 'kunden_id',
      e1Attr: 'fuehrerschein',
      rel: 'mietet',
      relAttr: 'tage',
      e2: 'Fahrzeug',
      e2Pk: 'kennzeichen',
      e2Attr: 'modell',
      card1: 'n',
      card2: 'm',
    },
    en: {
      name: 'Car_Rental',
      e1: 'Customer',
      e1Pk: 'customer_id',
      e1Attr: 'license_no',
      rel: 'rents',
      relAttr: 'days',
      e2: 'Vehicle',
      e2Pk: 'plate_no',
      e2Attr: 'model',
      card1: 'n',
      card2: 'm',
    },
  },
  music: {
    key: 'music',
    de: {
      name: 'Musik_Streaming',
      e1: 'Artist',
      e1Pk: 'artist_id',
      e1Attr: 'genre',
      rel: 'veröffentlicht',
      e2: 'Album',
      e2Pk: 'album_id',
      e2Attr: 'erscheinungsjahr',
      card1: '1',
      card2: 'n',
    },
    en: {
      name: 'Music_Streaming',
      e1: 'Artist',
      e1Pk: 'artist_id',
      e1Attr: 'genre',
      rel: 'releases',
      e2: 'Album',
      e2Pk: 'album_id',
      e2Attr: 'release_year',
      card1: '1',
      card2: 'n',
    },
  },
};

export function getBlogExampleDocument(
  exampleKey: BlogExampleKey,
  lang: LanguageCode,
): ErmDocument {
  const spec = SPECS[exampleKey] ?? SPECS.school;
  const s = lang === 'de' ? spec.de : spec.en;
  const prefix = `${exampleKey}_${lang}`;

  const nodes: ErmNode[] = [
    {
      id: `${prefix}_e1`,
      type: 'entity',
      label: s.e1,
      x: 160,
      y: 220,
      width: 140,
      height: 64,
    },
    {
      id: `${prefix}_e1_pk`,
      type: 'attribute',
      label: s.e1Pk,
      x: 80,
      y: 90,
      width: 130,
      height: 52,
      isPrimaryKey: true,
    },
    {
      id: `${prefix}_e1_a1`,
      type: 'attribute',
      label: s.e1Attr,
      x: 240,
      y: 90,
      width: 130,
      height: 52,
    },
    {
      id: `${prefix}_rel`,
      type: 'relationship',
      label: s.rel,
      x: 410,
      y: 212,
      width: 140,
      height: 80,
      isIdentifying: Boolean(s.relIdentifying),
    },
    {
      id: `${prefix}_e2`,
      type: 'entity',
      label: s.e2,
      x: 660,
      y: 220,
      width: 140,
      height: 64,
      isWeak: Boolean(s.e2Weak),
    },
    {
      id: `${prefix}_e2_pk`,
      type: 'attribute',
      label: s.e2Pk,
      x: 590,
      y: 90,
      width: 130,
      height: 52,
      isPrimaryKey: !s.e2Weak,
      isForeignKey: Boolean(s.e2Weak),
    },
    {
      id: `${prefix}_e2_a1`,
      type: 'attribute',
      label: s.e2Attr,
      x: 750,
      y: 90,
      width: 130,
      height: 52,
    },
  ];

  const edges: ErmEdge[] = [
    { id: `${prefix}_edge_1`, sourceId: `${prefix}_e1`, targetId: `${prefix}_e1_pk`, cardinality: '' },
    { id: `${prefix}_edge_2`, sourceId: `${prefix}_e1`, targetId: `${prefix}_e1_a1`, cardinality: '' },
    {
      id: `${prefix}_edge_3`,
      sourceId: `${prefix}_e1`,
      targetId: `${prefix}_rel`,
      cardinality: s.card1,
    },
    {
      id: `${prefix}_edge_4`,
      sourceId: `${prefix}_rel`,
      targetId: `${prefix}_e2`,
      cardinality: s.card2,
      isTotalParticipation: Boolean(s.e2Weak),
    },
    { id: `${prefix}_edge_5`, sourceId: `${prefix}_e2`, targetId: `${prefix}_e2_pk`, cardinality: '' },
    { id: `${prefix}_edge_6`, sourceId: `${prefix}_e2`, targetId: `${prefix}_e2_a1`, cardinality: '' },
  ];

  if (s.relAttr) {
    nodes.push({
      id: `${prefix}_rel_a`,
      type: 'attribute',
      label: s.relAttr,
      x: 415,
      y: 350,
      width: 130,
      height: 52,
    });
    edges.push({
      id: `${prefix}_edge_7`,
      sourceId: `${prefix}_rel`,
      targetId: `${prefix}_rel_a`,
      cardinality: '',
    });
  }

  return {
    id: `blog_example_${prefix}`,
    name: s.name,
    notationMode: 'chen',
    nodes,
    edges,
    zoom: 1,
    panX: 0,
    panY: 0,
    showGrid: true,
    gridStyle: 'dots',
    snapToGrid: true,
  };
}
