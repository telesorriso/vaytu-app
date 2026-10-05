// =============================================================================
// TELESORRISO — Configurazione del questionario (unica fonte di verità)
// =============================================================================
// Questo file è usato SIA dal browser (copiato in /js/quiz-config.mjs dalla
// build) SIA dalla Netlify Function che riceve il lead (per validare le
// risposte e scriverne le etichette leggibili nell'email).
//
// Per un test CRO si può:
//   - cambiare testi di domande e opzioni (`title`, `label`)
//   - cambiare l'ordine delle domande (spostando gli oggetti nell'array)
//   - aggiungere/togliere domande
// Gli `id` delle domande e delle opzioni sono valori tecnici: se si cambiano,
// cambiano anche i valori registrati negli eventi di tracciamento.
// `emailLabel` è l'etichetta della riga corrispondente nell'email del lead.
// Deve restare un file "puro" (solo dati, nessuna API Node o browser).
// =============================================================================

export const QUESTIONS = [
  {
    id: 'obiettivo',
    title: 'Cosa vorresti migliorare del tuo sorriso?',
    emailLabel: 'Cosa vorrebbe migliorare',
    options: [
      { id: 'affollati', label: 'Denti affollati' },
      { id: 'spazi', label: 'Spazi tra i denti' },
      { id: 'allineamento', label: 'Allineamento dei denti' },
      { id: 'morso', label: 'Morso' },
      { id: 'altro', label: 'Altro' },
      { id: 'non_so', label: 'Non lo so' },
    ],
  },
  {
    id: 'tempistica',
    title: 'Quando vorresti iniziare?',
    emailLabel: 'Quando vorrebbe iniziare',
    options: [
      { id: 'subito', label: 'Appena possibile' },
      { id: 'entro_1_mese', label: 'Entro 1 mese' },
      { id: 'entro_1_3_mesi', label: 'Entro 1-3 mesi' },
      { id: 'valutando', label: 'Sto solo valutando' },
    ],
  },
  {
    id: 'pagamento',
    title: 'Ti interessa il pagamento da €150 al mese?',
    emailLabel: 'Interesse per il pagamento da €150 al mese',
    options: [
      { id: 'si', label: 'Sì' },
      { id: 'unica_soluzione', label: 'Preferisco pagare in un’unica soluzione' },
      { id: 'entrambe', label: 'Vorrei conoscere entrambe le possibilità' },
    ],
  },
];

/** Parametri di attribuzione conservati durante tutto il funnel. */
export const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
];

/**
 * Modalità "drag and drop" (Netlify Forms): nomi dei campi inviati a Netlify.
 * Sono anche le etichette che la segreteria legge nell'email di notifica,
 * nell'ordine qui indicato. Il campo `subject` imposta l'oggetto dell'email.
 */
export const NETLIFY_FORM_NAME = 'lead';
export const NETLIFY_FORM_FIELDS = [
  'subject',
  'nome',
  'telefono',
  'email',
  'cosa-vorrebbe-migliorare',
  'quando-vorrebbe-iniziare',
  'interesse-pagamento-150-al-mese',
  'sorgente',
  'mezzo',
  'campagna',
  'contenuto',
  'termine',
  'gclid',
  'fbclid',
  'landing-page',
  'referrer',
  'data-e-ora',
  'presa-visione-privacy',
  'consenso-marketing',
  'id-richiesta',
  'azione',
];
