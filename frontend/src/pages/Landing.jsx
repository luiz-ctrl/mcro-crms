import { useState, useEffect, useRef } from 'react';
import './Landing.css';



function QueueDisplay({ mini = false }) {
  const [state, setState] = useState({ current: null, waiting: [], stats: { total: 0, served: 0, waiting: 0 } });
  const safeStats = state?.stats ?? { total: 0, served: 0, waiting: 0 };
  const safeWaiting = state?.waiting ?? [];
  const [animate, setAnimate] = useState(false);
  const prevNumRef = useRef(null);

  useEffect(() => {
    const fetchQ = async () => {
      if (document.hidden) return; // don't poll when tab is not visible
      try {
        const res = await window.fetch('/api/queue');
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.stats) return;
        setState(data);
        if (data.current?.number !== prevNumRef.current) {
          setAnimate(true);
          setTimeout(() => setAnimate(false), 600);
          prevNumRef.current = data.current?.number ?? null;
        }
      } catch (e) { console.warn('Queue fetch failed:', e); }
    };
    fetchQ();
    const t = setInterval(fetchQ, 2500);
    // Resume polling immediately when user returns to the tab
    const onVisible = () => { if (!document.hidden) fetchQ(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const isOfficeHours = (() => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    return day >= 1 && day <= 4 && hour >= 7 && hour < 17;
  })();

  if (!mini && !isOfficeHours && !state.current) {
    return (
      <div className="landing-queue-card queue-card-idle">
        <div className="queue-now-label" style={{ marginBottom: 12 }}>
          <span className="queue-dot queue-dot-idle" />
          Queue Status
        </div>
        <div className="queue-idle-title">Office Closed</div>
        <div className="queue-idle-sub">
          Walk-in queue is active<br />Monday - Thursday, 7:00 AM – 5:00 PM
        </div>
      </div>
    );
  }

  if (mini) {
    return (
      <div className="footer-queue-mini">
        <div className="footer-queue-label">
          <span className="footer-queue-dot" />
          Now Serving
        </div>
        <div className={`footer-queue-num ${animate ? 'queue-number-animate' : ''}`}>
          {state.current ? String(state.current.number).padStart(3, '0') : '—'}
        </div>
        <div className="footer-queue-stats">
          <div className="footer-q-stat">
            <span className="footer-q-val">{safeStats.total}</span>
            <span className="footer-q-lbl">Total</span>
          </div>
          <div className="footer-q-div" />
          <div className="footer-q-stat">
            <span className="footer-q-val">{safeStats.served}</span>
            <span className="footer-q-lbl">Served</span>
          </div>
          <div className="footer-q-div" />
          <div className="footer-q-stat">
            <span className="footer-q-val">{safeStats.waiting}</span>
            <span className="footer-q-lbl">Waiting</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-queue-card">
      <div className="queue-card-header">
        <div className="queue-now-label">
          <span className="queue-dot" />
          Now Serving
        </div>
      </div>
      <div className={`queue-number ${animate ? 'queue-number-animate' : ''}`}>
        {state.current ? String(state.current.number).padStart(3, '0') : '—'}
      </div>
      {state.current && (
        <div className="queue-called-at">
          Called at {new Date(state.current.called_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
      <div className="queue-stats-row">
        <div className="queue-stat">
          <span className="queue-stat-val">{safeStats.total}</span>
          <span className="queue-stat-label">Total Today</span>
        </div>
        <div className="queue-stat-divider" />
        <div className="queue-stat">
          <span className="queue-stat-val">{safeStats.served}</span>
          <span className="queue-stat-label">Served</span>
        </div>
        <div className="queue-stat-divider" />
        <div className="queue-stat">
          <span className="queue-stat-val">{safeStats.waiting}</span>
          <span className="queue-stat-label">Waiting</span>
        </div>
      </div>
      {safeWaiting.length > 0 && (
        <div className="queue-waiting-list">
          <div className="queue-waiting-title">In Queue</div>
          {safeWaiting.slice(0, 5).map((w, i) => (
            <div key={w.id} className="queue-waiting-item">
              <span className="queue-waiting-pos">#{i + 1}</span>
              <span className="queue-waiting-num">{String(w.number).padStart(3, '0')}</span>
              <span className="queue-waiting-time">{new Date(w.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  useEffect(() => {
    let retries = 0;
    const MAX_RETRIES = 3;
    const fetchAnnouncement = () => {
      window.fetch('/api/announcement')
        .then(r => r.json())
        .then(d => { if (d.message) setAnnouncement(d); })
        .catch(() => {
          if (retries < MAX_RETRIES) {
            retries++;
            setTimeout(fetchAnnouncement, 2000 * retries); // exponential-ish back-off
          }
        });
    };
    fetchAnnouncement();
  }, []);
  if (!announcement) return null;
  return (
    <div className="landing-announcement">
      <span className="landing-announcement-icon" aria-hidden="true">📢</span>
      <span className="landing-announcement-text">{announcement.message}</span>
    </div>
  );
}

const GOALS = [
  {
    label: 'Apply for a Passport',
    icon: '✈️',
    docs: [
      { name: 'PSA Birth Certificate (original)', note: 'Request from PSA or MCRO' },
      { name: 'Valid government-issued ID', note: 'PhilSys, Driver\'s License, etc.' },
    ],
    tip: 'You need a PSA-issued copy, not just the local CTC. MCRO can provide the CTC; PSA copy must be requested at a PSA outlet or online.',
  },
  {
    label: 'Get Married',
    icon: '💍',
    docs: [
      { name: 'CENOMAR for both parties', note: 'Certificate of No Marriage Record — ₱200 each' },
      { name: 'PSA Birth Certificate (both parties)', note: 'Must be PSA-issued' },
      { name: 'Valid ID (both parties)', note: 'Any government-issued ID' },
      { name: 'Marriage License Application', note: 'Filed at MCRO — ₱500 fee' },
    ],
    tip: 'The marriage license is valid for 120 days from issuance. Apply at least 2 weeks before your intended wedding date.',
  },
  {
    label: 'Register a Newborn',
    icon: '👶',
    docs: [
      { name: 'Hospital birth certificate', note: 'Issued by the hospital or birth attendant' },
      { name: 'Valid ID of parents', note: 'Both parents if married' },
      { name: 'Marriage certificate of parents', note: 'If applicable' },
    ],
    tip: 'On-time registration must be filed within 30 days of birth — it is free. After 30 days it becomes a delayed registration with a ₱500 fee.',
  },
  {
    label: 'Register a Death',
    icon: '📋',
    docs: [
      { name: 'Hospital/physician death certificate', note: 'Or certificate of attending midwife' },
      { name: 'Valid ID of the informant', note: 'Person filing the registration' },
      { name: 'Proof of relationship to deceased', note: 'If claiming the document' },
    ],
    tip: 'Death must be registered within 30 days from the date of death. Late registration incurs a fee.',
  },
  {
    label: 'Correct a Record (Clerical Error)',
    icon: '✏️',
    docs: [
      { name: 'Original civil registry document', note: 'The document to be corrected' },
      { name: 'Accomplished R.A. 9048 petition form', note: 'Available at MCRO' },
      { name: 'Supporting documents', note: 'School records, baptismal cert, valid ID' },
      { name: 'Filing fee', note: '₱3,000 for first name / clerical error changes' },
    ],
    tip: 'R.A. 9048 covers change of first name and correction of clerical errors. R.A. 10172 covers corrections to day/month of birth or sex. Processing takes 1–3 months.',
  },
  {
    label: 'Get a Certified Copy (CTC/CRF)',
    icon: '📄',
    docs: [
      { name: 'Valid government-issued ID', note: 'Any government ID' },
      { name: 'Accomplished request form', note: 'Available at MCRO front desk' },
      { name: 'Authorization letter', note: 'Only if requesting on behalf of another person' },
    ],
    tip: 'Certified copies are released the same day for records on file at MCRO. Fee is ₱150 (CTC) or ₱75 (CRF).',
  },
];

const VALID_IDS = [
  'Philippine Passport (DFA)',
  "Driver's License (LTO)",
  'Professional Regulations Commission (PRC) ID',
  'Integrated Bar of the Philippines (IBP) ID',
  'Government Service Insurance System (GSIS) Unified Multi-Purpose ID',
  'Social Security System (SSS) Unified Multi-Purpose ID',
  'Home Development Mutual Fund (Pag-IBIG) Transaction/Loyalty Card',
  "Voter's ID (COMELEC)",
  'Postal ID (PhilPost)',
  "Senior Citizen's ID Card",
  'OSCA ID / Local Government Unit (LGU) ID',
  'OFW / DOLE ID',
  "Seaman's Book / MARINA ID",
  'Overseas Workers Welfare Administration (OWWA) ID',
  'NBI Clearance / Philippine National Police (PNP) Clearance',
  'Diplomatic/Consular ID',
  'Barangay ID / Certification with picture and signature',
  'Person with Disability (PWD) ID (NCDA) / DSWD ID',
  'Pantawid Pamilyang Pilipino Program (4Ps) ID',
  'IDs issued by National Government Agencies (AFP, DOH, DENR, DAR, DOJ, etc.)',
];

const REQUIREMENTS = [
  {
    service: '1. Registration of Birth (Timely)',
    icon: '👶',
    fee: '₱100.00 + ₱50.00 doc stamp',
    time: '20 minutes',
    who: 'Parents of newborn, guardian/relatives, attendant at birth (midwife, physician, nurse)',
    items: [
      'Certificate of Marriage of parents',
      'Government-issued ID of registrant',
    ],
  },
  {
    service: '2. Registration of Marriage (Timely)',
    icon: '💍',
    fee: '₱100.00 + ₱50.00 doc stamp',
    time: '15 minutes',
    who: 'Solemnizing Officer or duly authorized representative',
    items: [
      'Four (4) copies of accomplished Certificate of Marriage',
    ],
  },
  {
    service: '3. Registration of Death (Timely)',
    icon: '📋',
    fee: '₱650.00 + ₱50.00 doc stamp',
    time: '~30 minutes',
    who: 'Attendant at death, physician responsible for reporting death, immediate family of the deceased',
    items: [
      'Birth/Marriage Certificate of the deceased',
      'Valid ID of the informant',
    ],
  },
  {
    service: '4. Issuance of Certified Copy (Birth, Marriage, Death)',
    icon: '📄',
    fee: '₱50.00 + ₱50.00 doc stamp',
    time: '20 minutes',
    who: 'Public — owner, authorized representative',
    items: [
      'Valid government-issued ID of owner/representative',
      'Authorization Letter/Special Power of Attorney (if representative)',
    ],
  },
  {
    service: '5. Delayed Registration of Birth (Parents Married)',
    icon: '👶',
    fee: '₱300.00 + ₱50.00 doc stamp',
    time: '11 days and 30 minutes',
    who: 'Parents, attendant at birth, registrant',
    items: [
      'Birth Negative Certificate from PSA',
      'Baptismal Certificate',
      'VRR (Voter Registration Record)',
      'COM/COLB',
      'School records',
      'Government-issued ID',
      'Any other document with date/place of birth and name of parents (e.g. insurance)',
      'Affidavit of 2 disinterested persons',
    ],
  },
  {
    service: '6. Delayed Registration of Marriage',
    icon: '💍',
    fee: '₱200.00',
    time: '11 days and 30 minutes',
    who: 'Contracting parties, parents of contracting parties, solemnizing officer',
    items: [
      'Marriage Negative Certification from PSA',
      'Affidavit of 2 disinterested persons',
      'Affidavit of delayed registration',
      '4 copies of accomplished Certificate of Marriage (if from church/judge/pastor)',
      'Valid ID of the registrant',
      'Authorization Letter/Special Power of Attorney & valid ID (if representative)',
    ],
  },
  {
    service: '7. Delayed Registration of Death Certificate',
    icon: '📋',
    fee: '₱200.00',
    time: '11 days and 30 minutes',
    who: 'Parents, attendant at birth, relatives of deceased, contracting parties, solemnizing officer',
    items: [
      'Death Negative Certification from PSA',
      'Affidavit of 2 disinterested persons',
      'Affidavit of informant',
      'Certificate of attending physician',
      'Certificate of Barangay Captain/Church certificate',
    ],
  },
  {
    service: '8. Application for Marriage License',
    icon: '💍',
    fee: 'Application ₱150 + Counseling ₱100 + Solemnization ₱400 + License ₱2 + Misc. ₱200/pair — Total: ₱1,052.00',
    time: '11 days, 4 hours and 34 minutes',
    who: 'Person intending to marry where one or both parties are residents of the town',
    items: [
      'CENOMAR (from PSA)',
      'Birth Certificate (from PSA)',
      'Consent or Advice of parents/Guardian (if below 21 y/o or 25 y/o respectively)',
      'Certificate of Legal Capacity to contract marriage (for foreign nationals — from Embassy)',
      'Death certificate of deceased spouse (for widow/widower)',
      'Valid Government ID',
      'Residence Certificate',
      'Tree Planting Certificate',
    ],
  },
  {
    service: '9. Change of First Name / Correction of Clerical Error (RA 9048 & RA 10172)',
    icon: '✏️',
    fee: 'Change of First Name: ₱3,000 | Change of Gender/Date of Birth: ₱3,000 | Correction of Clerical Error: ₱1,000',
    time: '11 days, 1 hour and 23 minutes',
    who: 'Owner of the document or any person authorized by law/Affidavit of non-employment',
    items: [
      'Birth Certificate in Security Paper',
      'Police Clearance / NBI Clearance',
      'Certificate of Employment or Affidavit of non-employment',
      'Baptismal Certificate',
      'Form 137 / Elementary school records',
      'Employment Records',
      'Voter Certificate',
      'Valid ID',
      'Affidavit of publication from local newspaper',
      '(For Gender/Date of Birth) Medical records, baptismal certificate, school records, marriage contract, government-issued IDs',
    ],
  },
  {
    service: '10. Registration of Legal Documents (Affidavit of Paternity, Acknowledgement, Legitimation, Affidavit to Use Surname of Father)',
    icon: '⚖️',
    fee: '₱400.00 + ₱50.00 doc stamp',
    time: 'Approx. 35 minutes',
    who: 'Parents of the child',
    items: [
      'PSA copy of Birth Certificate',
      'CENOMAR',
      'Marriage Certificate',
      'Public Document Acknowledging the Paternity',
      'Valid ID',
      'Cedula',
      'Death Certificate (if one of the parents is dead)',
    ],
  },
  {
    service: '11. Registration of Birth (Timely — Parents NOT Married)',
    icon: '👶',
    fee: '₱400.00 + ₱50.00 doc stamp',
    time: 'Approx. 45 minutes',
    who: 'Parents of newborn, guardian/relatives, attendant at birth (midwife, physician, nurse)',
    items: [
      "Parent's Birth Certificate",
      'Government-issued ID of registrant',
    ],
  },
  {
    service: '12. Registration of Birth (Delayed — Parents NOT Married)',
    icon: '👶',
    fee: '₱400.00 + ₱50.00 doc stamp',
    time: '11 days and 42 minutes',
    who: 'Parents of newborn, guardian/relatives, attendant at birth (midwife, physician, nurse)',
    items: [
      "Parent's Birth Certificate",
      'Government-issued ID of registrant',
      'Cedula',
      'Record showing date and place of birth of the child',
      'Negative certification from PSA',
      'School record',
      'Under 5 record',
    ],
  },
];

const FEES = [
  {
    category: '(a) Marriage Fees',
    icon: '💍',
    items: [
      { service: 'Application for marriage license — Filipino citizens', fee: '₱250.00' },
      { service: 'Application for marriage license — Foreigner/Alien', fee: '₱750.00' },
      { service: 'Marriage License Fee (Accountable Form)', fee: '₱200.00' },
      { service: 'Marriage Solemnization Fee', fee: '₱500.00' },
      { service: 'Marriage Counseling Fee — Filipino citizens', fee: '₱200.00' },
      { service: 'Marriage Counseling Fee — Foreigner', fee: '₱300.00' },
      { service: 'Marriage Counseling — Family planning fee', fee: '₱200.00' },
      { service: 'Marriage Counseling — Foreigner/Alien (family planning)', fee: '₱300.00' },
    ],
  },
  {
    category: '(b) Registration Fees',
    icon: '📋',
    items: [
      { service: 'Legitimation', fee: '₱300.00' },
      { service: 'Adoption', fee: '₱1,000.00' },
      { service: 'Annulment of Marriage', fee: '₱1,000.00' },
      { service: 'Legal Separation', fee: '₱600.00' },
      { service: 'Naturalization', fee: '₱500.00' },
      { service: 'Change of Name', fee: '₱3,000.00' },
      { service: 'Other legal documentation for record purposes', fee: '₱500.00' },
      { service: 'To use the surname of father (RA 9255)', fee: '₱200.00' },
      { service: 'Declaration of Presumptive Death', fee: '₱600.00' },
    ],
  },
  {
    category: '(c) Certified Copies & Other Fees',
    icon: '📄',
    items: [
      { service: 'BREQS fee (per page)', fee: '₱100.00' },
      { service: 'Civil Registry Form — Local use', fee: '₱50.00' },
      { service: 'Civil Registry Form — Abroad', fee: '₱170.00' },
      { service: 'Registration of Live Birth (Miscellaneous Fee)', fee: '₱30.00' },
      { service: 'Registration of Death (Miscellaneous Fee)', fee: '₱30.00' },
      { service: 'Transfer of Cadaver', fee: '₱150.00' },
      { service: 'Fee for exhumation of Cadaver', fee: '₱500.00' },
      { service: 'Fee of removal of remains', fee: '₱150.00' },
      { service: 'Burial Permit Fee', fee: '₱100.00' },
      { service: 'Delayed registration (less than 1 year)', fee: '₱100.00' },
      { service: 'Delayed registration (more than 1 year)', fee: '₱200.00' },
      { service: 'Endorsement Fee', fee: '₱50.00' },
      { service: 'Verification Fee', fee: '₱30.00' },
      { service: 'Correction of clerical error (RA 9048)', fee: '₱1,000.00' },
      { service: 'Change of first name (RA 9048)', fee: '₱3,000.00' },
      { service: 'Correction of clerical error (RA 10172)', fee: '₱3,000.00' },
    ],
  },
];

const FS_GRADIENTS = [
  'linear-gradient(135deg,#0f2044 0%,#2563eb 100%)',
  'linear-gradient(135deg,#7c3a00 0%,#d97706 100%)',
  'linear-gradient(135deg,#14532d 0%,#16a34a 100%)',
  'linear-gradient(135deg,#1e1b4b 0%,#6d28d9 100%)',
  'linear-gradient(135deg,#0c4a6e 0%,#0891b2 100%)',
  'linear-gradient(135deg,#4c0519 0%,#be123c 100%)',
  'linear-gradient(135deg,#422006 0%,#b45309 100%)',
  'linear-gradient(135deg,#0f2044 0%,#c9973a 100%)',
  'linear-gradient(135deg,#064e3b 0%,#059669 100%)',
  'linear-gradient(135deg,#312e81 0%,#4338ca 100%)',
  'linear-gradient(135deg,#1a2e05 0%,#4d7c0f 100%)',
  'linear-gradient(135deg,#1c1917 0%,#78716c 100%)',
];

const FRONTLINE_SERVICES = [
  {
    id: 1,
    title: 'Registration of Birth',
    subtitle: 'Timely Registration',
    icon: '👶',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Parents of newborn, guardian/relatives, attendant at birth (midwife, physician, nurse)',
    requirements: [
      { item: 'Certificate of Marriage of parents', source: 'PSA, Office of the City/Municipal Civil Registrar' },
      { item: 'Government-issued ID of registrant', source: 'SSS, GSIS, Post Office, Comelec, DFA, Pag-Ibig' },
    ],
    steps: [
      { client: 'Write and submit request form', agency: 'Receive the request and interview the client', fee: '', time: '7 minutes', person: 'Melgeane Del Mundo' },
      { client: 'Wait for the document being prepared', agency: 'Prepare the Certificate of Live Birth, MCR Staff affix signature in the prepared portion of the Certificate of Live Birth', fee: '', time: '10 minutes', person: 'Joselito Genciana' },
      { client: 'If document is in order, affix signature on the document and proceed to the MHO/attendant at birth for signature', agency: 'Affix signature in the document', fee: '', time: '', person: 'RHU-Physician, Midwife or Hilot' },
      { client: 'Pay the corresponding fee at the Municipal Treasurer\'s Office', agency: 'Issue Official receipt', fee: '₱50.00 + Doc Stamp ₱50.00', time: '', person: 'Office of the Municipal Treasurer' },
      { client: 'Wait for the release of the document', agency: '1. Present the document to the MCR for review and signature. 2. Assign registry number', fee: '', time: '3 minutes', person: 'Marianne F. Anchinges / Gernigan R. Mendoza' },
      { client: 'Receive the requested document', agency: 'Enter the registered Birth certificate at the corresponding Registry Book', fee: '', time: '', person: 'Darryl B. Dirain / Mariah Kaye A. Batariano' },
    ],
    totalFee: '₱100.00',
    totalTime: '20 minutes',
  },
  {
    id: 2,
    title: 'Registration of Marriage',
    subtitle: 'Timely Registration',
    icon: '💍',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Solemnizing Officer who solemnized the marriage; contracting parties may register if the solemnizing officer is unable; any person duly authorized by the solemnizing officer',
    requirements: [
      { item: 'Four (4) copies of accomplished Certificate of Marriage', source: 'Office of the Solemnizing Officer' },
    ],
    steps: [
      { client: 'Submit four (4) copies duly accomplished Certificate of Marriage', agency: 'Accept Certificate of Marriage, check for the completeness', fee: '', time: '8 minutes', person: 'Mylene R. Los Anes' },
      { client: 'Pay the corresponding fee at the Municipal Treasurer\'s Office', agency: 'Issue Official receipt', fee: '₱50.00 + Doc stamp ₱50.00', time: '', person: 'Office of the Municipal Treasurer' },
      { client: 'Wait for the release of the document', agency: '1. Staff presents the document to the MCR for review and signature. 2. Assign registry number', fee: '', time: '5 minutes', person: 'Marianne F. Anchinges' },
      { client: 'Receive the document', agency: 'Release owner\'s copy and solemnizing officer\'s copy', fee: '', time: '2 minutes', person: 'Mylene R. Los Añes' },
    ],
    totalFee: '₱100.00',
    totalTime: '15 minutes',
  },
  {
    id: 3,
    title: 'Registration of Death',
    subtitle: 'Timely Registration',
    icon: '📋',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Attendant at death, physician responsible to report death; immediate family of the deceased',
    requirements: [
      { item: 'Birth Certificate/Marriage Certificate of the deceased', source: 'PSA, Office of The City/Municipal Civil Registrar' },
      { item: 'Valid ID of the informant', source: 'SSS, GSIS, Post Office, Comelec, DFA, Pag Ibig' },
    ],
    steps: [
      { client: 'Write and submit request and requirements', agency: '1. Receive the request and check the requirements. 2. Interview the client. 3. Issue order of payment', fee: '', time: '2 min / 10 min', person: 'Melgeane Del Mundo' },
      { client: 'Pay the corresponding fee at the Mun. Treasurer\'s Office', agency: 'Issue Official receipt', fee: '₱650.00 + Doc stamp ₱50.00', time: '', person: 'Office of the Municipal Treasurer' },
      { client: 'Wait for the document being prepared', agency: 'Prepare the death certificate. Present the document to the client for review and correction. MCR Staff affix the signature in the prepared portion of the Certificate of Death', fee: '', time: '11 minutes', person: 'Joselito Genciana' },
      { client: 'If documents are in order, affix signature on the document', agency: 'Review and Certify the Death Certificate', fee: '', time: '', person: 'Municipal Health Officer' },
      { client: 'Proceed to the Embalmer for the certification of the deceased being embalmed', agency: 'Certify the Embalmed deceased', fee: '', time: '', person: 'Licensed Embalmer' },
      { client: 'Wait for the duly signed document', agency: '1. Present the document to the MCR for signature. 2. Assign registry number.', fee: '', time: '3 min / 2 min', person: 'Marianne F. Anchinges' },
      { client: 'Receive the document', agency: 'Release the document.', fee: '', time: '2 minutes', person: 'Melgeane R. Del Mundo' },
    ],
    totalFee: '₱700.00',
    totalTime: '30 minutes',
  },
  {
    id: 4,
    title: 'Issuance of Certified Copy',
    subtitle: 'Birth, Marriage and Death Certificate',
    icon: '📄',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Public',
    requirements: [
      { item: 'Valid ID of the owner/authorized person/representative', source: 'SSS, GSIS, Post Office, Comelec, DFA, Pag Ibig' },
      { item: 'Authorization Letter/Special Power of Attorney (if representative)', source: 'Citizen or Client being represented' },
    ],
    steps: [
      { client: 'Write and submit request and requirements', agency: 'Receive the request and interview the client. MCR Staff verifies the record and issue order of payment', fee: '', time: '1 min / 15 min', person: 'Melgeane Del Mundo' },
      { client: 'Pay the corresponding fee at the Mun. Treasurer\'s Office', agency: 'Issue Official receipt', fee: '₱50.00 + Doc stamp ₱50.00', time: '', person: 'Office of the Municipal Treasurer' },
      { client: 'Wait for the duly signed document', agency: 'Prepare the certified copy of the certificate. MCR affix the signature to the requested document', fee: '', time: '3 minutes', person: 'Joselito Genciana / Marianne F. Anchinges' },
      { client: 'Receive the document', agency: 'Release the document to the requester', fee: '', time: '1 minute', person: 'Melgeane R. Del Mundo' },
    ],
    totalFee: '₱100.00',
    totalTime: '20 minutes',
  },
  {
    id: 5,
    title: 'Delayed Registration of Birth',
    subtitle: 'Parents are Married',
    icon: '👶',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Parents, attendant at birth, registrant',
    requirements: [
      { item: 'Birth Negative Certificate from PSA', source: 'PSA' },
      { item: 'Baptismal Certificate', source: 'Church where the child was baptized' },
      { item: 'VRR (Voter Registration Record)', source: 'Comelec' },
      { item: 'COM/COLB', source: 'Office of the City/Municipal Civil Registrar' },
      { item: 'School records', source: 'School attended' },
      { item: 'Government-issued ID', source: 'SSS, GSIS, Pag-ibig, DFA, Post Office' },
      { item: 'Any other document with date and place of birth, Name of parents (e.g. insurance)', source: 'Insurance Company' },
      { item: 'Affidavit of 2 disinterested persons', source: 'Mayor\'s Office/MCR Office/Notary Public' },
    ],
    steps: [
      { client: 'Write and submit request', agency: 'Receive the request and interview the client.', fee: '', time: '2 minutes', person: ' Melgeane Del Mundo' },
      { client: 'Submit the requirements', agency: 'Receive and check the completeness and correctness of the documents submitted. Prepare the documents.', fee: '', time: '3 min / 20 min', person: 'Joselito Genciana' },
      { client: 'Pay the corresponding fee at the Mun. Treasurer\'s Office', agency: 'Advise client to pay the required fees at the MTO. Advise client to return after 10 working days. Prepare the Certificate of Live Birth, MCR Staff affix his/her signature in the prepared COLB. Posting of Notice of Delayed Registration.', fee: '₱250.00 + Doc stamp ₱50.00', time: '11 days', person: 'Marianne F. Anchinges / Joselito Genciana / Maricen Figuerra' },
      { client: 'Follow-up request after 10 working days', agency: '1. Assign Registry Number. 2. MCR Affix the signature on the document.', fee: '', time: '2 min / 2 min', person: 'Joselito Genciana / Marianne F. Anchinges' },
      { client: 'Receive the document', agency: 'Release owner\'s/registrant\'s/solemnizing officer\'s copy', fee: '', time: '1 minute', person: 'Melgeane Del Mundo' },
    ],
    totalFee: '₱300.00',
    totalTime: '11 days and 30 minutes',
  },
  {
    id: 6,
    title: 'Delayed Registration of Marriage',
    subtitle: '',
    icon: '💍',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Contracting parties, Parents of the contracting parties, solemnizing officer',
    requirements: [
      { item: 'Marriage – negative certification from PSA', source: 'Phil. Statistics Authority' },
      { item: 'Affidavit of 2 disinterested person', source: 'Mayor\'s Office/Notary Public' },
      { item: 'Affidavit of delayed registration', source: 'Mayor\'s Office/Notary Public' },
      { item: '4 copies of accomplished COM (if from the church/judge/pastor)', source: 'Solemnizing Officer\'s office' },
      { item: 'Valid ID of the registrant', source: 'SSS, GSIS, Pag-Ibig, DFA, Post Office' },
      { item: 'For Representative: Authorization Letter/Special Power of Attorney & Valid ID', source: 'Citizen/Client being represented / SSS, GSIS, Pag-Ibig, DFA, Post Office' },
    ],
    steps: [
      { client: 'Write and submit request and requirements', agency: 'Receive the request from the client. Receive and check the completeness and correctness of the documents submitted. Prepare the documents.', fee: '', time: '2 min / 3 min / 20 min', person: 'Melgeane Del Mundo / Carmelita Dollesin / Joselito Genciana / Maricen Figuerra' },
      { client: 'Pay the corresponding fee at the Mun. Treasurer\'s Office', agency: 'Advise client to pay the required fees at the MTO. Advise client to return after 10 working days. Posting period of notice of delayed registration.', fee: '₱150.00 + Doc stamp ₱50.00', time: '11 days', person: 'Office of the Municipal Treasurer' },
      { client: '', agency: 'Present the document to the MCR for review and signature.', fee: '', time: '2 minutes', person: 'Marianne F. Anchinges' },
      { client: '', agency: 'Assign registry number', fee: '', time: '2 minutes', person: 'Joselito Genciana / Maricen Figuerra' },
      { client: 'Receive the document', agency: 'Release informant\'s copy', fee: '', time: '1 minute', person: 'Melgeane Del Mundo' },
    ],
    totalFee: '₱200.00',
    totalTime: '11 days and 30 minutes',
  },
  {
    id: 7,
    title: 'Delayed Registration of Death Certificate',
    subtitle: '',
    icon: '📋',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Parents, attendant at birth (birth), relatives of the deceased (death), contracting parties, solemnizing officer (marriage)',
    requirements: [
      { item: 'Death-Negative Certification from PSA', source: 'Phil. Statistics Office' },
      { item: 'Affidavit of 2 disinterested persons', source: 'Mayor\'s office/Notary Public' },
      { item: 'Affidavit of informant', source: 'Mayor\'s office/Notary Public' },
      { item: 'Certificate of attending physician', source: 'Mun. Health Office' },
      { item: 'Certificate of Barangay Captain/Church certificate', source: 'Barangay Hall/Church where the deceased was given rites' },
    ],
    steps: [
      { client: 'The client/applicant submits the requirements', agency: 'Receive the request and interview the client.', fee: '', time: '2 minutes', person: 'Mylene Los Añes' },
      { client: 'Staff verify the completeness of the requirements', agency: 'Receive and check the completeness and correctness of the documents submitted. Prepare the documents, Affidavit of delayed registration.', fee: '', time: '3 min / 20 min', person: 'Mylene Los Añes / Joselito Genciana' },
      { client: 'Client pay the fee at MTO', agency: 'Advise client to pay the required fees at the MTO. Advise client to return after 10 working days. Posting period of notice of delayed registration. Assign registry number. MCR affix the signature.', fee: '₱150.00 + Doc stamp ₱50.00', time: '11 days / 2 min / 2 min', person: 'Office of the Municipal Treasurer / Joselito Genciana / Marianne F. Anchinges' },
      { client: 'Client receives the copy of the document', agency: 'Release owner\'s copy and solemnizing officer\'s copy', fee: '', time: '1 minute', person: 'Mylene Los Añes' },
    ],
    totalFee: '₱200.00',
    totalTime: '11 days and 30 minutes',
  },
  {
    id: 8,
    title: 'Application for Marriage License',
    subtitle: '',
    icon: '💍',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Person intending to marry where one or both of the contracting parties is a/are resident/s of the town where the license is to be issued',
    requirements: [
      { item: 'CENOMAR', source: 'Phil. Statistics Authority' },
      { item: 'Birth Certificate of the Contracting Parties', source: 'PSA/Office of The City/Municipal Civil Registrar' },
      { item: 'Consent or Advice of parents or Guardian if below 21 y/o and 25y/o respectively', source: 'Office of The City/Municipal Civil Registrar' },
      { item: 'Certificate of Legal Capacity to contract marriage for citizens of foreign country', source: 'Embassy of the foreign contracting party' },
      { item: 'Death certificate of deceased spouse for widow/widower applicant', source: 'PSA/Office of The City/Municipal Civil Registrar' },
      { item: 'Valid Government ID', source: 'SSS/GSIS, Pag-Ibig, DFA, Post Office' },
      { item: 'Residence Certificate', source: 'Office of the Municipal Treasurer' },
      { item: 'Tree Planting Certificate', source: 'Office of the Municipal Agriculturist' },
    ],
    steps: [
      { client: 'Write and submit the request', agency: 'Receive the request and interview the client.', fee: '', time: '2 minutes', person: 'Mylene R. Los Anes' },
      { client: '', agency: 'Verifying the completeness of the submitted documents', fee: '', time: '5 minutes', person: 'Mylene R. Los Anes' },
      { client: 'Proceed to POPCOM, MSWDO/MHO for Pre Marriage Orientation and Counselling (every Tuesday)', agency: 'Conduct pre-marriage orientation and counselling', fee: '', time: '4 hrs', person: 'PMOC Team' },
      { client: 'Submit the requirements', agency: 'Receive the PMC certificate and Application for Marriage License', fee: 'Application fee-₱150 / Marriage counseling/family planning-₱100 / Marriage solemnization fee-₱400 / Marriage license fee-₱2 / Misc. fee ₱200/pair', time: '5 minutes', person: 'Mylene R. Los Anes' },
      { client: 'Pay the required fee at the Municipal Treasurer\'s Office', agency: 'Issue order of payment', fee: '', time: '', person: 'Municipal Tresurer\'s Office' },
      { client: 'Present the Official Receipt and sign the marriage application', agency: 'Preparation of Notice of Application for Marriage License. Issuance of Notice of Application.', fee: '', time: '15 min / 2 min', person: 'Mylene R. Los Añes' },
      { client: 'Return after 10 working days to the Municipal Registry Office', agency: 'Advise applicants to return after 10 working days. Assigning of the registry number. MCR affix the signature for Marriage License certificate. Issue the AML and Marriage License.', fee: '', time: '11 days / 2 min / 2 min / 1 min', person: 'Marianne F. Anchinges / Mylene R. Los Añes' },
      { client: 'Receive the document', agency: 'Issue the AML and Marriage License', fee: '', time: '1 minute', person: 'Mylene R. Los Añes' },
    ],
    totalFee: '₱1,052.00',
    totalTime: '11 days, 4 hours and 34 minutes',
  },
  {
    id: 9,
    title: 'Change of First Name / Correction of Clerical Error',
    subtitle: 'RA 9048 & RA 10172',
    icon: '✏️',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Owner of the documents, any person authorizes by law or by the owner of the documents',
    requirements: [
      { item: 'Change of First Name: Birth Certificate in Security paper, Police Clearance/NBI Clearance, Certificate of Employment or Affidavit of non-employment, Baptismal Certificate, Form 137-Elementary, Employment Records, Voter certificate, Valid ID\'s, Affidavit of publication from local newspaper', source: 'Phil. Statistics Authority / Police Station/NBI / Employer/Mayor\'s office/Notary Public / Church / Elementary school / Employer / Comelec / SSS, GSIS, Pag-Ibig, DFA, Post office / Newspaper company with wide circulation' },
      { item: 'Change of Gender and Date of Birth: Security paper of the documents, Police clearance/NBI clearance, Earliest school records, Medical records/medical certificate/ultrasound, baptismal certificate, voter\'s certification/registration records, Government issued IDs, marriage contract and birth certificate of children, affidavit of non-employment, affidavit of publication from local newspaper', source: 'Phil. Statistics Authority / Police Station/NBI / Elementary school / Hospital or laboratory, MHO / Church / Comelec / SSS, GSIS, Pag-Ibig, DFA, Post office / PSA/Office of the City/Municipal Civil Registrar / Mayor\'s office/Notary Public or Employer / Newspaper company with wide circulation' },
      { item: 'Correction of clerical error: Security paper of the document from PSA, Baptismal Certificate, school and employment records, voter certification, valid id\'s, docs supporting the errored entries', source: 'Phil. Statistics Authority / Church / School/Employer / Comelec / SSS, GSIS, Pag-Ibig, DFA, Post office / PSA/Office of The City/Municipal Civil Registrar' },
    ],
    steps: [
      { client: 'Write and submit request', agency: 'Receive the request and interview the client.', fee: '', time: '2 minutes', person: 'Joselito Genciana' },
      { client: 'Submit the requirements', agency: 'Receive and check the completeness and correctness of the documents submitted.', fee: 'Change of First Name-P 3,000.00 / Change of Gender/Date of Birth-P 3,000.00', time: '10 minutes', person: 'Marianne F. Anchinges' },
      { client: 'Pay the corresponding fee at the Municipal Treasurer\'s Office', agency: 'Issue Official Receipt', fee: 'Correction of Clerical Error-P 1,000.00', time: '', person: 'Office of the Municipal Treasurer' },
      { client: 'Submit Official Receipt', agency: 'Prepare the documents/', fee: '', time: '1 hour', person: 'Marianne F. Anchinges / Joselito Genciana' },
      { client: 'Sign the Petition', agency: 'Client affixes signature to the petition. MCR Affix the signature to the petition.', fee: '', time: '3 min / 3 min', person: 'Marianne F. Anchinges' },
      { client: 'Client is advised of the 10 days posting', agency: 'Advise the client to return after the 10 days posting period. Post the notice at the bulletin board for 10 days (CCE/CFN). Publish the petition for change of name / correction of clerical error in the sex and date of birth in a newspaper of general circulation once a week (3 weeks). Render decision on the petition after the completion of posting or publication in a newspaper. Forward petition to the Office of the Civil Registrar General for affirmation.', fee: '', time: '11 days', person: 'Marianne F. Anchinges / Joselito Genciana' },
      { client: 'Client receive the approved petition for endorsement to the PSA Legal office', agency: 'Prepare the endorsement/transmittal. Release the petition, record in the logbook and assign petition number, advise client to wait for the affirmation of the petition by the Civil Registrar General-PSA', fee: '', time: '', person: 'Marianne F. Anchinges / Joselito Genciana' },
      { client: 'Wait for 3-4 months for the affirmed petitions', agency: 'PSA Legal office acts on the petition and return the same to the LCR. Prepare, sign & issue the affirmed petition together with its supporting documents to be endorsed at PSA Lucena/Quezon City', fee: '', time: '5 minutes', person: 'Marianne F. Anchinges / Joselito Genciana' },
    ],
    totalFee: '₱1,000.00 – ₱3,000.00',
    totalTime: '11 days, 1 hour and 23 minutes',
  },
  {
    id: 10,
    title: 'Registration of Legal Documents',
    subtitle: 'Affidavit of Paternity, Acknowledgement, Legitimation, AUSF',
    icon: '⚖️',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Parents of the child',
    requirements: [
      { item: 'PSA copy birth certificate', source: 'Phil. Statistics Authority' },
      { item: 'CENOMAR', source: 'Phil. Statistics Authority' },
      { item: 'Marriage Certificate', source: 'PSA/Office of The City/Municipal Civil Registrar' },
      { item: 'Public Document Acknowledging the Paternity', source: 'Office of The City/Municipal Civil Registrar' },
      { item: 'Valid ID', source: 'SSS, GSIS, Pag-Ibig, DFA, Post office' },
      { item: 'Cedula', source: 'Office of the Municipal Treasurer' },
      { item: 'Death Certificate if one of the parents is dead', source: 'PSA/Office of The City/Municipal Civil Registrar' },
    ],
    steps: [
      { client: 'Write and submit request', agency: 'Receive the request and interview the client. Give list of requirements', fee: '', time: '5 minutes', person: 'Joselito Genciana' },
      { client: 'Submit required documents', agency: 'Review the completeness and authenticity of the documents.', fee: '', time: '10 minutes', person: 'Marianne F. Anchinges / Joselito Genciana' },
      { client: 'Pay the required fee at the Municipal Treasury Office', agency: 'Advise client to pay the corresponding fees at the Municipal Treasurer\'s Office.', fee: 'Php 400.00 + Doc stamp 50.00', time: '', person: 'Office of the Municipal Treasurer' },
      { client: 'Submit the official receipt', agency: 'Preparation of legal documents and assigning registry number', fee: '', time: '20 minutes', person: 'Joselito Genciana' },
    ],
    totalFee: '₱450.00',
    totalTime: 'Approx. 35 minutes',
  },
  {
    id: 11,
    title: 'Registration of Birth',
    subtitle: 'Timely Registration — Parents NOT Married',
    icon: '👶',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Parents of new-borns, guardian\'s relatives of new-born; attendant at birth i.e. midwife, physician, nurse',
    requirements: [
      { item: 'Parent\'s Birth Certificate', source: 'PSA, Office of the City/Municipal Civil Registrar' },
      { item: 'Government issued ID of registrant/parents', source: 'SSS, GSIS, Post Office, Comelec, DFA, Pag-Ibig' },
    ],
    steps: [
      { client: 'Write and submit request form', agency: 'Receive the request and interview the client', fee: '', time: '10 minutes', person: 'Melgeane Del Mundo / Carmelita Dollesin' },
      { client: 'Pay the corresponding fee at the Municipal Treasurer\'s Office', agency: 'Issue Official receipt', fee: 'Php 400.00 + Doc stamp 50.00', time: '', person: 'Office of the Municipal Treasurer' },
      { client: 'Wait for the document being prepared', agency: 'Prepare the Certificate of Live Birth, Affidavit to Use the Surname of Father, Affidavit of 2 disinterested person, MCR Staff affix his/her signature in the prepared portion of the Certificate of Live Birth', fee: '', time: '20 minutes', person: 'Joselito Genciana' },
      { client: 'If document is in order, affix signature on the document', agency: 'Affix signature in the document', fee: '', time: '5 minutes', person: 'RHU-Physician, Midwife or Hilot' },
      { client: 'Proceed to the MHO/attendant at birth for signature.', agency: 'Attendant at birth signs at the document', fee: '', time: '5 minutes', person: 'Marianne F. Anchinges' },
      { client: 'Return the document', agency: 'Present the document to the MCR for review and signature.', fee: '', time: '', person: 'Marianne F. Anchinges / Joselito Genciana' },
      { client: 'Receive the requested document and wait for the release of the COLB', agency: 'Assign registry number. Enter the registered Birth certificate at the corresponding Registry Book and release copy to the registrant or authorized representative', fee: '', time: '2 minute', person: 'Melgeane Del Mundo' },
    ],
    totalFee: '₱450.00',
    totalTime: '45 minutes',
  },
  {
    id: 12,
    title: 'Delayed Registration of Birth',
    subtitle: 'Parents NOT Married',
    icon: '👶',
    classification: 'Simple',
    type: 'G2C — Government to Citizens',
    who: 'Parents of new-borns, guardian\'s relatives of new-born; attendant at birth i.e. midwife, physician, nurse',
    requirements: [
      { item: 'Cedula', source: 'Municipal Treasurer Office' },
      { item: 'Record showing date and place of birth of the child, name of parents', source: '' },
      { item: 'Negative certification from PSA', source: 'School Attended' },
      { item: 'School record', source: 'Phil. Statistics Authority' },
      { item: 'Under 5 record', source: 'Municipal/Barangay Health Center' },
      { item: 'Parent\'s Birth Certificate', source: 'Church, Insurance' },
      { item: 'Government issued ID of registrant', source: 'SSS, GSIS, Post Office, Comelec, DFA, Pag-Ibig' },
    ],
    steps: [
      { client: 'Write and submit request form', agency: 'Receive the request, verify the completeness of the submitted requirements and interview the client.', fee: '', time: '10 minutes', person: 'Melgeane Del Mundo' },
      { client: 'Pay the corresponding fee at the Municipal Treasurer\'s Office', agency: 'Issue Official receipt', fee: 'Php 400.00 + Doc stamp 50.00', time: '', person: 'Office of the Municipal Treasurer' },
      { client: 'Wait for the document being prepared', agency: 'Live Birth, Affidavit to Use the Surname of Father, Affidavit of 2 disinterested person, affidavit of delayed registration, MCR Staff affix his/her signature in the prepared portion of the Certificate of Live Birth. Client is advised to wait for the release of the document in lieu of 10 days posting for Delayed Registration', fee: '', time: '5 minutes / 11 days', person: 'Marianne F. Anchinges' },
      { client: 'Advise the client to wait for 11-15 days for the release of documents in lieu of required 10-day posting', agency: 'Assign registry number. Present the document to the MCR for review and signature.', fee: '', time: '5 minutes', person: 'Marianne F. Anchinges' },
      { client: 'Wait for the release of the document', agency: 'Enter the registered Birth certificate at the corresponding Registry Book and release copy to the registrant or authorized representative', fee: '', time: '2 minute', person: 'Melgeane Del Mundo' },
    ],
    totalFee: '₱450.00',
    totalTime: '11 days and 42 minutes',
  },
];

function ServiceModal({ service, onClose }) {
  if (!service) return null;
  const grad = FS_GRADIENTS[(service.id - 1) % FS_GRADIENTS.length];
  return (
    <div className="fs-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={service.title}>
      <div className="fs-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="fs-modal-header" style={{ background: grad }}>
          <div className="fs-modal-header-icon-wrap">
            <span className="fs-modal-header-emoji">{service.icon}</span>
          </div>
          <div className="fs-modal-header-text">
            <div className="fs-modal-number">Service #{service.id}</div>
            <h2 className="fs-modal-title">{service.title}</h2>
            {service.subtitle && <div className="fs-modal-subtitle">{service.subtitle}</div>}
            <div className="fs-modal-badges">
              <span className="fs-badge fs-badge-class">{service.classification}</span>
              <span className="fs-badge fs-badge-type">{service.type}</span>
            </div>
          </div>
          <button className="fs-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="fs-modal-body">
          {/* Summary row */}
          <div className="fs-summary-row">
            <div className="fs-summary-pill">
              <span className="fs-summary-icon">💰</span>
              <div><div className="fs-summary-label">Total Fee</div><div className="fs-summary-val">{service.totalFee}</div></div>
            </div>
            <div className="fs-summary-pill">
              <span className="fs-summary-icon">⏱</span>
              <div><div className="fs-summary-label">Processing Time</div><div className="fs-summary-val">{service.totalTime}</div></div>
            </div>
          </div>

          {/* Who May Avail */}
          <div className="fs-section">
            <div className="fs-section-title">👥 Who May Avail</div>
            <p className="fs-section-text">{service.who}</p>
          </div>

          {/* Requirements */}
          <div className="fs-section">
            <div className="fs-section-title">📋 Checklist of Requirements</div>
            <div className="fs-req-table">
              <div className="fs-req-header">
                <span>Requirement</span>
                <span>Where to Secure</span>
              </div>
              {service.requirements.map((r, i) => (
                <div key={i} className="fs-req-row">
                  <span className="fs-req-item"><span className="fs-req-dot" />{r.item}</span>
                  <span className="fs-req-source">{r.source}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Client Steps */}
          <div className="fs-section">
            <div className="fs-section-title">🪜 Client Steps & Agency Action</div>
            <div className="fs-steps-table">
              <div className="fs-steps-header">
                <span>Client Steps</span>
                <span>Agency Action</span>
                <span>Fees</span>
                <span>Time</span>
                <span>Person Responsible</span>
              </div>
              {service.steps.map((s, i) => (
                <div key={i} className="fs-steps-row">
                  <span>{s.client && <><span className="fs-step-num">{i + 1}.</span> {s.client}</>}</span>
                  <span>{s.agency}</span>
                  <span className="fs-step-fee">{s.fee}</span>
                  <span className="fs-step-time">{s.time}</span>
                  <span className="fs-step-person">{s.person}</span>
                </div>
              ))}
              <div className="fs-steps-total">
                <span>TOTAL</span>
                <span></span>
                <span className="fs-step-fee">{service.totalFee}</span>
                <span className="fs-step-time">{service.totalTime}</span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FAQS = [
  {
    q: 'What valid IDs are accepted?',
    a: 'Any government-issued ID such as PhilSys (National ID), Passport, Driver\'s License, Voter\'s ID, PRC ID, SSS/GSIS ID, or Barangay ID.',
  },
  {
    q: 'Can I request documents for another person?',
    a: 'Yes, but you must bring an authorization letter signed by the document owner, plus a copy of their valid ID and your own valid ID.',
  },
  {
    q: 'What is the difference between CTC and PSA copy?',
    a: 'CTC (Certified True Copy) is issued by the Local Civil Registry (MCRO). PSA copy is issued by the Philippine Statistics Authority. Some transactions require PSA copies specifically.',
  },
  {
    q: 'How do I register a late birth?',
    a: 'Bring supporting documents such as baptismal certificate, school records, and affidavit of two witnesses. Processing takes 3–5 working days and requires a ₱500 filing fee.',
  },
  {
    q: 'Can I request documents online?',
    a: 'Currently, document requests must be done in person at the MCRO office. You may also request PSA documents online at psaserbilis.com.ph.',
  },
  {
    q: 'What are your office hours?',
    a: 'We are open Monday to Thursday, 7:00 AM to 5:00 PM. We are closed on weekends and public holidays.',
  },
];

/* ── Reusable org chart photo component ── */
/* ── Org chart person photo with fallback ── */
function OrgPhoto({ src, alt, size = 'md' }) {
  const [err, setErr] = useState(false);
  const px = size === 'lg' ? 80 : size === 'md' ? 68 : 58;
  return (
    <div className="oc-photo-wrap" style={{ width: px, height: px, minWidth: px }}>
      {!err && src
        ? <img src={src} alt={alt} className="oc-photo-img" onError={() => setErr(true)} />
        : <div className="oc-photo-placeholder">
            <svg width="45%" height="45%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
      }
    </div>
  );
}

/* ── Single horizontal org card ── */
function OcCard({ photo, position, name, title, sub, accent }) {
  return (
    <div className="oc-card">
      {/* Photo — left side with accent border */}
      <div className="oc-card-photo-col" style={{ borderColor: accent }}>
        <OrgPhoto src={photo} alt={name} size="lg" />
      </div>
      {/* Content — right side */}
      <div className="oc-card-content">
        <div className="oc-card-position" style={{ background: accent }}>{position}</div>
        <div className="oc-card-name">{name}</div>
        <div className="oc-card-title">{title}</div>
        {sub && <div className="oc-card-sub">{sub}</div>}
      </div>
    </div>
  );
}

function OrgChart() {
  const staffRow1 = [
    { name: 'MYLENE R. LOS AÑES',   title: 'Administrative Aide IV', photo: '/staff/mylene-losanes.png' },
    { name: 'MELGEANNE D. SEÑO',     title: 'Administrative Aide IV', photo: '/staff/melgeanne-seno.png' },
    { name: 'JOSELITO J. GENCIANA',  title: 'Administrative Aide I',  photo: '/staff/joselito-genciana.png' },
  ];
  const staffRow2 = [
    { name: 'MARIAH KAYE BATARIANO', title: 'Administrative Aide', photo: '/staff/mariah-batariano.png' },
    { name: 'DARRYL B. DIRAIN',      title: 'Administrative Aide', photo: '/staff/darryl-dirain.png' },
    { name: 'NORWINDA M. AGDA',      title: 'Administrative Aide', photo: '/staff/norwinda-agda.png' },
    { name: 'ALBERTO LUISTERIO',     title: 'Administrative Aide', photo: '/staff/alberto-luisterio.png' },
  ];

  return (
    <section id="orgchart" className="landing-orgchart-section">
      <div className="landing-section-inner">
        <div className="landing-section-header" style={{ textAlign: 'center' }}>
          <div className="landing-section-eyebrow">Our People</div>
          <h2 className="landing-section-title">Organizational Chart</h2>
          <p className="landing-section-sub">Meet the team serving the people of General Luna</p>
        </div>

        <div className="oc-tree">

          {/* Level 1 — Mayor */}
          <div className="oc-level oc-level-1">
            <OcCard
              photo="/staff/mayor-sangalang.png"
              position="MUNICIPAL MAYOR"
              name="JOSE STEVENSON SANGALANG"
              title="Municipal Mayor"
              sub="Municipality of General Luna"
              accent="#e91e8c"
            />
          </div>

          <div className="oc-connector-v" />

          {/* Level 2 — Civil Registrar */}
          <div className="oc-level oc-level-2">
            <OcCard
              photo="/staff/marianne-anchinges.png"
              position="CIVIL REGISTRAR"
              name="MARIANNE F. ANCHINGES"
              title="Municipal Civil Registrar"
              accent="#4caf50"
            />
          </div>

          <div className="oc-connector-v" />

          {/* Level 3 — Registration Officer */}
          <div className="oc-level oc-level-3">
            <OcCard
              photo="/staff/gernigan-mendoza.png"
              position="REGISTRATION OFFICER"
              name="GERNIGAN R. MENDOZA"
              title="Registration Officer I"
              accent="#00bcd4"
            />
          </div>

          <div className="oc-connector-spread" />

          {/* Level 4 — Staff Row 1 */}
          <div className="oc-level oc-grid oc-grid-3">
            {staffRow1.map((s, i) => (
              <OcCard key={i}
                photo={s.photo}
                position="ADMIN AIDE"
                name={s.name}
                title={s.title}
                accent="#00bcd4"
              />
            ))}
          </div>

          <div className="oc-connector-spread oc-connector-spread-2" />

          {/* Level 5 — Staff Row 2 */}
          <div className="oc-level oc-grid oc-grid-4">
            {staffRow2.map((s, i) => (
              <OcCard key={i}
                photo={s.photo}
                position="ADMIN AIDE"
                name={s.name}
                title={s.title}
                accent="#00bcd4"
              />
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

const smoothScrollTo = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const headerH = document.querySelector('.landing-header')?.offsetHeight ?? 72;
  const top = el.getBoundingClientRect().top + window.scrollY - headerH - 8;
  window.scrollTo({ top, behavior: 'smooth' });
};

/* ── Live open/closed badge ─────────────────────────────────── */
/* ── Copy address button ────────────────────────────────────── */
function ContactCopyButton() {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText('M5QC+8CX, Jacinto, Poblacion, General Luna, Quezon');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className="contact-copy-btn" onClick={handleCopy}>
      {copied
        ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
        : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy address</>
      }
    </button>
  );
}

export default function Landing() {
  const [openReq, setOpenReq] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSubtype, setSelectedSubtype] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [estimatorGoal, setEstimatorGoal] = useState(null);
  const [selectedFrontline, setSelectedFrontline] = useState(null);

  // Secret keyboard shortcut: Ctrl + Shift + A → Staff Portal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        window.location.href = '/login?key=login';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const services = [
    {
      icon: '📄', label: 'Birth Certificate', desc: 'On-time & delayed registration',
      color: '#2563eb', colorLight: '#dbeafe',
      subtypes: [
        {
          label: 'On-Time Registration — Married Parents',
          fee: '₱100.00 + ₱50.00 documentary stamp',
          time: '20 minutes',
          who: 'Father, mother, physician, nurse, midwife, or any person who attended the birth; in their absence, any relative or neighbor who knows the facts',
          requirements: [
            'Duly accomplished Certificate of Live Birth (Municipal Form No. 102) — signed by attending physician/midwife',
            'Certificate of Marriage of parents (PSA or LCR copy)',
            'Valid government-issued ID of the registrant/informant',
          ],
          note: 'Must be filed within 30 days from the date of birth. Registration is FREE if filed on time. The hospital usually handles registration for hospital births — confirm with the hospital before going to MCRO.',
        },
        {
          label: 'On-Time Registration — Parents NOT Married',
          fee: '₱400.00 + ₱50.00 documentary stamp',
          time: 'Approx. 45 minutes',
          who: 'Mother (primary), or father if acknowledged; midwife or physician who attended the birth',
          requirements: [
            'Duly accomplished Certificate of Live Birth (Municipal Form No. 102)',
            "PSA Birth Certificate of both parents (if available)",
            'Valid government-issued ID of the registrant/informant',
            'Affidavit of Acknowledgement / Admission of Paternity at the back of COLB (if father acknowledges)',
            'Affidavit to Use Surname of the Father / AUSF (R.A. 9255) — if child will use father\'s surname',
          ],
          note: 'For illegitimate children, the child is registered under the mother\'s surname by default. To use the father\'s surname, an AUSF must be executed by the mother (or guardian). Must be filed within 30 days from birth.',
        },
        {
          label: 'Delayed Registration — Married Parents',
          fee: '₱300.00 + ₱50.00 documentary stamp',
          time: '11 days and 30 minutes (includes 10-day posting period)',
          who: 'Parents, legal guardian, or the registrant themselves if already of legal age; in their absence, any person who has knowledge of the facts of birth',
          requirements: [
            'Duly accomplished Certificate of Live Birth (Municipal Form No. 102)',
            'PSA Certificate of No Record of Birth (Negative Certification) — original copy',
            'LCR Certificate of No Record (from MCRO)',
            'Certificate of Marriage of parents — PSA or LCR certified copy',
            'At least TWO (2) of the following documentary evidence showing name, date/place of birth, and filiation:',
            '  • Baptismal/Dedication Certificate',
            '  • DepEd Form 137 / Elementary or High School records',
            '  • Immunization / Nursery Card / Under-5 record',
            '  • Voter\'s Registration Record (VRR)',
            '  • Employment or Service Record',
            '  • Insurance Policy or Membership Record',
            '  • Income Tax Return of parents',
            '  • Medical records',
            'Duly notarized Joint Affidavit of 2 Disinterested Persons who have personal knowledge of the birth',
            'Valid government-issued ID of the applicant/informant',
          ],
          note: 'Per PSA Memorandum Circular 2024-17: Persons 18 years old and above must appear in person before the civil registrar. For minors with married parents, both parents must be present. A 10-day posting period is required before final approval and registration.',
        },
        {
          label: 'Delayed Registration — Parents NOT Married',
          fee: '₱400.00 + ₱50.00 documentary stamp',
          time: '11 days and 42 minutes (includes 10-day posting period)',
          who: 'Mother (primary); if mother is unavailable, the father with affidavit; or legal guardian with court-issued appointment',
          requirements: [
            'Duly accomplished Certificate of Live Birth (Municipal Form No. 102)',
            'PSA Certificate of No Record of Birth (Negative Certification) — original copy',
            'LCR Certificate of No Record (from MCRO)',
            'PSA Birth Certificate of both parents (original or certified copy)',
            'At least TWO (2) documentary evidence showing name, date/place of birth:',
            '  • Baptismal/Dedication Certificate',
            '  • DepEd Form 137 / school records',
            '  • Immunization / Nursery Card / Under-5 record',
            '  • Voter\'s Registration Record (VRR)',
            '  • Employment or Service Record',
            '  • Medical or insurance records',
            'Duly notarized Joint Affidavit of 2 Disinterested Persons',
            'Valid government-issued ID of the applicant/informant',
            'Cedula / Community Tax Certificate of applicant',
            'Affidavit of Acknowledgement / Admission of Paternity (if father will acknowledge)',
            'AUSF (Affidavit to Use Surname of Father) — if child will use father\'s surname under R.A. 9255',
          ],
          note: 'Per PSA Memorandum Circular 2024-17: Mother must appear in person for minor registrants. An unedited, front-facing photo of the registrant must be attached to the application. A 10-day posting period is required before final registration.',
        },
      ],
    },
    {
      icon: '💍', label: 'Marriage Certificate', desc: 'Marriage contract & registration',
      color: '#c9973a', colorLight: '#fef3c7',
      subtypes: [
        {
          label: 'On-Time Registration of Marriage',
          fee: '₱100.00 + ₱50.00 documentary stamp',
          time: '15 minutes',
          who: 'Solemnizing Officer or duly authorized representative; must be filed within 15 days of the marriage ceremony',
          requirements: [
            'Four (4) copies of the duly accomplished and signed Certificate of Marriage',
            'Valid government-issued ID of the person filing',
          ],
          note: 'The Solemnizing Officer is responsible for registering the marriage at the MCRO of the city/municipality where the marriage was celebrated. Must be submitted within 15 days after the ceremony.',
        },
        {
          label: 'Delayed Registration of Marriage',
          fee: '₱200.00',
          time: '11 days and 30 minutes (includes 10-day posting period)',
          who: 'Contracting parties, parents, or solemnizing officer',
          requirements: [
            'PSA Negative Certification of Marriage (CENOMAR) — for both bride and groom',
            'Four (4) copies of duly accomplished Certificate of Marriage (new form)',
            'Certified true copy of the marriage certificate issued by the church/solemnizing authority where marriage was celebrated',
            'Affidavit of Delayed Registration — executed by the contracting parties or solemnizing officer',
            'Affidavit of 2 disinterested persons who witnessed the marriage',
            'Valid government-issued ID of both parties',
            'Cedula / Community Tax Certificate',
          ],
          note: 'A 10-day posting period is required. The Solemnizing Officer must execute an affidavit stating the place, date, facts, and reason for delay of registration.',
        },
        {
          label: 'Application for Marriage License',
          fee: '₱1,052.00 total — Application ₱150 + Counseling ₱100 + Solemnization ₱400 + License ₱2 + Misc. ₱200/pair',
          time: '11 days, 4 hours and 34 minutes (includes mandatory 10-day posting period)',
          who: 'Both contracting parties must personally appear; at least one must be a resident of the municipality for at least 15 days',
          requirements: [
            'PSA Birth Certificate of both parties (original, on Security Paper)',
            'CENOMAR — PSA Certificate of No Marriage Record of both parties',
            'Valid government-issued ID of both parties',
            'Residence Certificate (Cedula) / Proof of residency',
            'Certificate of Attendance at Pre-Marriage Counseling / Family Planning Seminar',
            'Tree Planting Certificate (required by LGU)',
            '— For ages 18–21: Written Parental Consent (Article 14, Family Code)',
            '— For ages 22–25: Parental Advice (Article 15, Family Code)',
            '— For widow/widower: PSA Death Certificate of deceased spouse + CENOMAR',
            '— For annulled/nullified marriage: Annotated PSA Marriage Certificate + Court Decision + Certificate of Finality',
            '— For foreign nationals: Certificate of Legal Capacity to Contract Marriage (from their Embassy/Consulate)',
          ],
          note: 'Marriage License is valid for 120 days from date of issuance. After 10-day posting period and no opposition is filed, the license is released. Apply at least 2–3 weeks before your intended wedding date.',
        },
      ],
    },
    {
      icon: '📋', label: 'Death Certificate', desc: 'Death registration & certification',
      color: '#dc2626', colorLight: '#fee2e2',
      subtypes: [
        {
          label: 'On-Time Registration of Death',
          fee: '₱650.00 + ₱50.00 documentary stamp',
          time: 'Approx. 30 minutes',
          who: 'Attending physician or health officer; in their absence, the nearest relative or any person who has personal knowledge of the death',
          requirements: [
            'Duly accomplished Certificate of Death (Municipal Form No. 103) — signed by attending physician or health officer',
            'Burial/Cemetery Certificate or Funeral Home certification',
            'PSA Birth Certificate or Marriage Certificate of the deceased (if available)',
            'Valid government-issued ID of the informant',
            'Official Receipt or certification from funeral home',
          ],
          note: 'Must be registered within 30 days from the date of death. The health officer must approve registration in the box provided in the Certificate of Death. A burial permit is required before the deceased can be buried or cremated.',
        },
        {
          label: 'Delayed Registration of Death',
          fee: '₱200.00',
          time: '11 days and 30 minutes (includes 10-day posting period)',
          who: 'Nearest relative of the deceased, barangay captain, or any person with knowledge of the death',
          requirements: [
            'PSA Certificate of No Record of Death (Negative Certification) — original copy',
            'Duly accomplished Certificate of Death (Municipal Form No. 103)',
            'Certificate of attending physician or health officer',
            'Burial/Cemetery Certificate or Official Receipt from funeral home',
            'PSA Birth Certificate or Marriage Certificate of the deceased (if available)',
            'Certificate of Barangay Captain of the place of death, OR Church/Parish certificate of death',
            'Affidavit of 2 disinterested persons with personal knowledge of the death',
            'Affidavit of the informant stating reason for delay',
            'Valid government-issued ID of the informant',
          ],
          note: 'A 10-day posting period is required. Late registration must be approved by the PSA Civil Registrar General. In every delayed registration, the entry is made in red ink with the remark "Delayed Registration" on the upper right margin of the certificate.',
        },
      ],
    },
    {
      icon: '🔍', label: 'CENOMAR', desc: 'Certificate of No Marriage Record',
      color: '#7c3aed', colorLight: '#ede9fe',
      subtypes: [
        {
          label: 'Issuance of CENOMAR',
          fee: '₱200.00 (walk-in at MCRO) · ₱420.00 (PSA online via PSAHelpline.ph)',
          time: '20 minutes (walk-in) · 1–3 working days (online delivery)',
          who: 'Owner of the record; parent or child of the subject; authorized representative with proper authorization',
          requirements: [
            'Valid government-issued ID of the requester (must match name on record)',
            'Accomplished CENOMAR request form (available at MCRO front desk)',
            '— If requesting on behalf of another person:',
            '  • Authorization Letter signed by the document owner',
            '  • Valid I.D. of the May-Ari (document owner)',
            '  • Valid I.D. of the authorized representative',
          ],
          note: 'Per R.A. 10173 (Data Privacy Act) & Rule 24 – Administrative Order 1993: CENOMAR is issued ONLY to (5) May-Ari ng Dokumento, (6) Anak, Asawa, Magulang ng May-Ari, (7) Court, (8) Pinahihintulutan ng May-Ari.\n\nCommonly required for: marriage license application, overseas employment (OFW), visa applications (fiancé/spousal), and insurance or benefit claims. An authorized representative may only request for a maximum of 2 unrelated individuals.',
        },
      ],
    },
    {
      icon: '📝', label: 'CTC / CRF', desc: 'Certified true copies of records',
      color: '#059669', colorLight: '#d1fae5',
      subtypes: [
        {
          label: 'Issuance of Certified True Copy (Birth, Marriage, Death)',
          fee: '₱50.00 + ₱50.00 documentary stamp (CTC) · ₱75.00 (CRF) · ₱100.00/page (BREQS)',
          time: 'Same day — released same day for records on file at MCRO',
          who: 'Owner of the record, immediate family (spouse, child, parent), court, or duly authorized representative',
          requirements: [
            'Valid government-issued ID of the owner or authorized representative',
            'Accomplished request form (available at MCRO front desk)',
            '— If requesting on behalf of another person (authorized representative):',
            '  • Authorization Letter / Special Power of Attorney signed by the document owner',
            '  • Valid I.D. of the May-Ari (document owner)',
            '  • Valid I.D. of the Authorized Representative',
          ],
          note: 'Per R.A. 10173 (Data Privacy Act) & Rule 24 – Administrative Order 1993: Certified copies of Birth, Marriage, and Death records are released ONLY to:\n  (5) May-Ari ng Dokumento\n  (6) Anak, Asawa, Magulang ng May-Ari ng Sertipiko\n  (7) Court\n  (8) Sa Pinahihintulutan ng May-Ari\n\nAn authorized representative may NOT delegate their authority to another person and may only request for a maximum of 2 unrelated individuals.',
        },
      ],
    },
    {
      icon: '⚖️', label: 'Legal Documents', desc: 'R.A. 9048, R.A. 10172, Legitimation',
      color: '#0891b2', colorLight: '#e0f2fe',
      subtypes: [
        {
          label: 'Change of First Name — R.A. 9048',
          fee: '₱3,000.00',
          time: '11 days, 1 hour and 23 minutes (administrative level; may take 1–3 months for PSA annotation)',
          who: 'Owner of the document; or any person duly authorized by law; must submit Affidavit of Non-Employment if unemployed',
          requirements: [
            'PSA Birth Certificate in Security Paper (original)',
            'NBI Clearance and PNP Clearance (stating all names used)',
            'Employer\'s Clearance (if employed) OR Affidavit of Non-Employment and non-pending case (if unemployed)',
            'Baptismal Certificate',
            'DepEd Form 137 / Elementary school records',
            'Voter\'s Certificate (if registered voter)',
            'Employment Records (if applicable)',
            'Valid government-issued ID',
            'Affidavit of Publication from local newspaper (required after approval — posted for 2 weeks)',
          ],
          note: 'R.A. 9048 covers: (1) Change of first name or nickname, (2) Correction of clerical or typographical errors. Processing includes a 10-day posting period at MCRO and PSA. After approval at the MCRO level, the petition is forwarded to the PSA Civil Registrar General for final annotation on the PSA copy.',
        },
        {
          label: 'Correction of Day/Month of Birth or Sex — R.A. 10172',
          fee: '₱3,000.00',
          time: '11 days, 1 hour and 23 minutes (administrative; 1–3 months for PSA annotation)',
          who: 'Owner of the document or duly authorized representative',
          requirements: [
            'PSA Birth Certificate in Security Paper (original)',
            'NBI Clearance and PNP Clearance',
            'Employer\'s Clearance OR Affidavit of Non-Employment and no pending case',
            'Baptismal Certificate',
            'DepEd Form 137 / school records showing correct date of birth',
            'Medical Certificate issued by an accredited government physician (for sex correction — certifying no sex change surgery was performed)',
            'Voter\'s Certificate (if registered voter)',
            'Valid government-issued ID',
            'Affidavit of Publication from local newspaper',
          ],
          note: 'R.A. 10172 covers: (1) Correction of day and/or month of birth, (2) Correction of sex. This law does NOT cover change of year of birth or change of nationality — those require judicial proceedings (Rule 108, Rules of Court).',
        },
        {
          label: 'Correction of Clerical Error — R.A. 9048',
          fee: '₱1,000.00',
          time: '11 days, 1 hour and 23 minutes',
          who: 'Owner of the document or duly authorized representative',
          requirements: [
            'PSA Birth Certificate in Security Paper (original)',
            'At least 2 authentic documents supporting the correct entry (school records, baptismal certificate, medical records, valid ID, insurance records)',
            'Accomplished petition form (available at MCRO)',
            'Valid government-issued ID',
            'Cedula / Community Tax Certificate',
          ],
          note: 'Clerical errors are harmless and innocuous mistakes (e.g., misspelling of a name, wrong day/month of birth). Substantial changes (e.g., change of year of birth, legitimacy status) are NOT covered and must go through court.',
        },
        {
          label: 'Legitimation / Affidavit of Paternity / AUSF (R.A. 9255)',
          fee: '₱400.00 + ₱50.00 documentary stamp',
          time: 'Approx. 35 minutes',
          who: 'Both parents (father and mother); for AUSF — mother or guardian for minor child, or the adult child themselves',
          requirements: [
            'PSA Birth Certificate of the child (original, on Security Paper)',
            'PSA CENOMAR of both parents',
            'PSA Marriage Certificate of parents (if applicable — for legitimation)',
            'Public Document Acknowledging Paternity (Affidavit of Acknowledgement / Admission of Paternity)',
            'Valid government-issued ID of both parents',
            'Cedula / Community Tax Certificate',
            'PSA Death Certificate of deceased parent (if one of the parents is deceased)',
          ],
          note: 'Legitimation applies when parents of an illegitimate child subsequently marry. The child\'s status is automatically legitimated by the subsequent valid marriage of the parents (Article 177, Family Code). AUSF (R.A. 9255) allows an illegitimate child to use the father\'s surname — this does NOT change the child\'s legitimacy status.',
        },
      ],
    },
  ];

  return (
    <>
      <div className="landing-page">
      <a href="#services" className="skip-link" onClick={e => { e.preventDefault(); smoothScrollTo('services'); }}>Skip to main content</a>
      <div className="landing-bg" />

      {/* Announcement */}
      <AnnouncementBanner />

      {/* Header */}
      <header className="landing-header">
        {/* Top utility bar */}
        <div className="landing-header-topbar">
          <div className="landing-header-topbar-inner">
            <span className="landing-topbar-label">Republic of the Philippines</span>
            <span className="landing-topbar-sep">·</span>
            <span className="landing-topbar-label">General Luna, Quezon</span>
          </div>
        </div>

        {/* Main header row */}
        <div className="landing-header-inner">
          <div className="landing-brand">
            <div className="landing-logo-ring">
              <img src="/logo.png" alt="MCRO Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
            </div>
            <div className="landing-brand-text">
              <div className="landing-brand-name">MUNICIPAL REGISTRARS OFFICE</div>
              <div className="landing-brand-loc">General Luna, Quezon</div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="landing-nav">
            <button onClick={() => smoothScrollTo('services')}  className="landing-nav-link">Services</button>
            <button onClick={() => smoothScrollTo('records')}   className="landing-nav-link">Records</button>
            <button onClick={() => smoothScrollTo('faq')}       className="landing-nav-link">FAQ</button>
            <button onClick={() => smoothScrollTo('orgchart')}  className="landing-nav-link">Our Team</button>
            <button onClick={() => smoothScrollTo('contact')}   className="landing-nav-link landing-nav-cta">Contact</button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="landing-nav-hamburger"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(o => !o)}
          >
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <div id="mobile-menu" className={`landing-mobile-menu${menuOpen ? ' open' : ''}`} role="navigation" aria-label="Mobile navigation">
          <button className="landing-mobile-link" onClick={() => { smoothScrollTo('services');  setMenuOpen(false); }}>Services</button>
          <button className="landing-mobile-link" onClick={() => { smoothScrollTo('records');   setMenuOpen(false); }}>Records</button>
          <button className="landing-mobile-link" onClick={() => { smoothScrollTo('faq');       setMenuOpen(false); }}>FAQ</button>
          <button className="landing-mobile-link" onClick={() => { smoothScrollTo('orgchart');  setMenuOpen(false); }}>Our Team</button>
          <button className="landing-mobile-link landing-mobile-cta" onClick={() => { smoothScrollTo('contact'); setMenuOpen(false); }}>Contact</button>
        </div>
      </header>

      {/* Full-bleed Hero with image */}
      <section className="landing-hero-full">
        {/* Background image overlay */}
        <div className="landing-hero-image-bg" />
        <div className="landing-hero-overlay" />

        <div className="landing-hero-inner">
          <div className="landing-hero-text">
            <div className="landing-hero-badge">Civil Registry Services</div>
            <h1 className="landing-hero-title">Welcome to MCRO<br />General Luna</h1>
            <p className="landing-hero-sub">
              The Municipal Civil Registrar's Office provides civil registration services to all residents of General Luna, Quezon. We maintain official records of births, marriages, deaths, and other civil documents.
            </p>
            <div className="landing-office-hours">
              <div className="landing-office-hours-title">Office Hours</div>
              <div className="landing-office-hours-row">
                <span>Monday — Thursday</span>
                <span>7:00 AM — 5:00 PM</span>
              </div>
              <div className="landing-office-hours-row">
                <span>Friday — Sunday</span>
                <span>Closed</span>
              </div>
            </div>
          </div>
          <div className="landing-hero-queue">
            <QueueDisplay />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="landing-hero-scroll-hint">
          <span className="scroll-hint-text">Scroll to explore</span>
          <span className="scroll-hint-arrow">↓</span>
        </div>
      </section>

      <div className="landing-stats-strip">
        <div className="landing-stats-inner">
          <div className="landing-stat-item">
            <span className="stat-number">12+</span>
            <span className="stat-label">Document Types</span>
          </div>
          <div className="stat-divider" />
          <div className="landing-stat-item">
            <span className="stat-number">Same Day</span>
            <span className="stat-label">CTC &amp; CRF Release</span>
          </div>
          <div className="stat-divider" />
          <div className="landing-stat-item">
            <span className="stat-number">Mon-Thurs</span>
            <span className="stat-label">8 AM – 5 PM</span>
          </div>
          <div className="stat-divider" />
          <div className="landing-stat-item">
            <span className="stat-number">Free</span>
            <span className="stat-label">Queue &amp; Walk-in</span>
          </div>
        </div>
      </div>

      {/* Services */}
      {/* Service Detail Modal */}
      <ServiceModal service={selectedFrontline} onClose={() => setSelectedFrontline(null)} />

      {/* Frontline Services */}
      <section id="services" className="landing-services">
        <div className="landing-section-inner">
          <div className="landing-section-header" style={{ textAlign: 'center' }}>
            <div className="landing-section-eyebrow">Citizens' Charter</div>
            <h2 className="landing-section-title">Frontline Services</h2>
            <p className="landing-section-sub">Click a service card to view complete details, requirements, and step-by-step procedures</p>
          </div>
          <div className="fs-grid">
            {FRONTLINE_SERVICES.map((svc, idx) => (
              <button
                key={svc.id}
                className="fs-card"
                onClick={() => setSelectedFrontline(svc)}
                aria-label={`View details for ${svc.title}`}
              >
                <div className="fs-card-img-wrap" style={{ background: FS_GRADIENTS[idx % FS_GRADIENTS.length] }}>
                  <div className="fs-card-img-emoji">{svc.icon}</div>
                  <div className="fs-card-num">#{svc.id}</div>
                </div>
                <div className="fs-card-body">
                  <div className="fs-card-title">{svc.title}</div>
                  {svc.subtitle && <div className="fs-card-subtitle">{svc.subtitle}</div>}
                  <div className="fs-card-meta">
                    <span className="fs-card-fee">💰 {svc.totalFee}</span>
                    <span className="fs-card-time">⏱ {svc.totalTime}</span>
                  </div>
                  <div className="fs-card-cta">View Details →</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Records Available */}
      <section id="records" className="landing-records-section">
        <div className="landing-section-inner">
          <div className="landing-section-header" style={{ textAlign: 'center' }}>
            <div className="landing-section-eyebrow">On File at MCRO</div>
            <h2 className="landing-section-title">Records Available</h2>
            <p className="landing-section-sub">Civil registration records currently on file at the MCRO General Luna</p>
          </div>

          {/* Stats bar */}
          <div className="records-stats-bar">
            <div className="records-stat-card">
              <div className="records-stat-num">1954</div>
              <div className="records-stat-lbl">Oldest record on file</div>
            </div>
            <div className="records-stat-card">
              <div className="records-stat-num">70+ years</div>
              <div className="records-stat-lbl">Of civil registration history</div>
            </div>
            <div className="records-stat-card records-stat-complete">
              <div className="records-stat-num">Complete</div>
              <div className="records-stat-lbl">From 1995 to present</div>
            </div>
          </div>

          <div className="records-table-wrap">
            {/* Birth */}
            <div className="records-col">
              <div className="records-col-header records-birth">
                <div className="records-col-header-left">
                  <div className="records-col-icon-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div>
                    <div className="records-col-title">Birth</div>
                    <div className="records-col-subtitle">9 partial + complete from 1995</div>
                  </div>
                </div>
                <span className="records-count-badge">10 entries</span>
              </div>
              <div className="records-col-body">
                {[
                  '1954','1959','1960 – 1963','1965 – 1969',
                  '1970 – 1979','1980 – 1985','1987 – 1988',
                  '1990 – 1991','1994',
                ].map((yr, i) => (
                  <div key={i} className="records-row records-row-partial">
                    <span className="records-yr-label">{yr}</span>
                    <span className="records-yr-tag records-tag-partial">incomplete</span>
                  </div>
                ))}
                <div className="records-row records-row-present">
                  <span className="records-yr-label">1995 – Present</span>
                  <span className="records-yr-tag records-tag-complete">complete</span>
                </div>
              </div>
            </div>

            {/* Marriage */}
            <div className="records-col">
              <div className="records-col-header records-marriage">
                <div className="records-col-header-left">
                  <div className="records-col-icon-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </div>
                  <div>
                    <div className="records-col-title">Marriage</div>
                    <div className="records-col-subtitle">5 partial + complete from 1995</div>
                  </div>
                </div>
                <span className="records-count-badge">6 entries</span>
              </div>
              <div className="records-col-body">
                {[
                  '1970 – 1979','1980 – 1985','1986 – 1989',
                  '1990 – 1991','1994',
                ].map((yr, i) => (
                  <div key={i} className="records-row records-row-partial">
                    <span className="records-yr-label">{yr}</span>
                    <span className="records-yr-tag records-tag-partial">incomplete</span>
                  </div>
                ))}
                <div className="records-row records-row-present">
                  <span className="records-yr-label">1995 – Present</span>
                  <span className="records-yr-tag records-tag-complete">complete</span>
                </div>
              </div>
            </div>

            {/* Death */}
            <div className="records-col">
              <div className="records-col-header records-death">
                <div className="records-col-header-left">
                  <div className="records-col-icon-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                  </div>
                  <div>
                    <div className="records-col-title">Death</div>
                    <div className="records-col-subtitle">6 partial + complete from 1995</div>
                  </div>
                </div>
                <span className="records-count-badge">7 entries</span>
              </div>
              <div className="records-col-body">
                {[
                  '1984','1990','1991','1992','1993','1994',
                ].map((yr, i) => (
                  <div key={i} className="records-row records-row-partial">
                    <span className="records-yr-label">{yr}</span>
                    <span className="records-yr-tag records-tag-partial">incomplete</span>
                  </div>
                ))}
                <div className="records-row records-row-present">
                  <span className="records-yr-label">1995 – Present</span>
                  <span className="records-yr-tag records-tag-complete">complete</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gap years notice */}
          <div className="records-gap-notice">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0, marginTop:2}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Years not listed (e.g. 1955–1958, 1964, 1992–1993 for Birth) have <strong>no records on file</strong> at MCRO — they were never registered or were not transmitted to this office.</span>
          </div>

          <div className="records-footnote">
            <strong>Incomplete records</strong> — some entries for these years may not be available on file. Visit the MCRO office or contact us directly to confirm availability before your visit.
          </div>
        </div>
      </section>

      {/* Image Feature Strip */}
      <div className="landing-image-feature">
        <div className="landing-image-feature-left">
          <img
            src="/staff.png"
            alt="MCRO General Luna Staff"
            className="landing-feature-img"
          />
        </div>
        <div className="landing-image-feature-right">
          <div className="landing-section-eyebrow" style={{ color: 'rgba(201,151,58,0.9)' }}>Our Commitment</div>
          <h2 className="landing-feature-title">Serving the People of General Luna</h2>
          <p className="landing-feature-body">
            The MCRO is dedicated to maintaining accurate, accessible, and timely civil registration records for every resident. From birth to marriage to death, we are with you every step of life's journey.
          </p>
          <div className="landing-feature-badges">
            <span className="feature-badge"><span aria-hidden="true">✅</span> Accurate Records</span>
            <span className="feature-badge"><span aria-hidden="true">⚡</span> Fast Processing</span>
            <span className="feature-badge"><span aria-hidden="true">🤝</span> Courteous Service</span>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section id="faq" className="landing-section-alt">
        <div className="landing-section-inner">
          <div className="landing-section-header">
            <div className="landing-section-eyebrow">Got Questions?</div>
            <h2 className="landing-section-title">Frequently Asked Questions</h2>
            <p className="landing-section-sub">Common questions about our services</p>
          </div>
          <div className="landing-faq-grid">
            {FAQS.map((f, i) => (
              <div key={i} className="landing-accordion">
                <button
                  className="landing-accordion-btn"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{f.q}</span>
                  <span className={`landing-accordion-arrow ${openFaq === i ? 'open' : ''}`} aria-hidden="true">›</span>
                </button>
                {openFaq === i && (
                  <div className="landing-accordion-body">
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.7 }}>{f.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Org Chart */}
      <OrgChart />

      {/* Contact & Map */}
      <section id="contact" className="landing-contact">
        <div className="landing-section-inner">
          <div className="landing-section-header" style={{ textAlign: 'center' }}>
            <div className="landing-section-eyebrow">Find Us</div>
            <h2 className="landing-section-title">Contact & Location</h2>
            <p className="landing-section-sub">Visit us at the Municipal Hall compound, General Luna, Quezon</p>
          </div>

          <div className="contact-layout">
            {/* LEFT — info cards */}
            <div className="contact-cards-col">

              {/* Address */}
              <div className="contact-info-card">
                <div className="contact-info-icon-wrap contact-icon-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div className="contact-info-body">
                  <div className="contact-info-label">Address</div>
                  <div className="contact-info-val">M5QC+8CX, Jacinto, Poblacion,<br/>General Luna, Quezon</div>
                  <ContactCopyButton />
                </div>
              </div>

              {/* Office Hours with live open/closed badge */}
              <div className="contact-info-card">
                <div className="contact-info-icon-wrap contact-icon-gold">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="contact-info-body">
                  <div className="contact-info-label">Office Hours</div>
                  <div className="contact-info-val">Mon – Thurs, 7:00 AM – 5:00 PM</div>
                  <div className="contact-hours-row">
                    <span className="contact-hours-sub">Fri – Sun: Closed</span>
                  </div>
                </div>
              </div>

              {/* Facebook */}
              <div className="contact-info-card">
                <div className="contact-info-icon-wrap contact-icon-fb">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </div>
                <div className="contact-info-body">
                  <div className="contact-info-label">Facebook</div>
                  <a href="https://www.facebook.com/josel.genciana" target="_blank" rel="noopener noreferrer" className="contact-fb-val-link">
                    MCRO General Luna
                  </a>
                  <div className="contact-info-sub">Message us for inquiries</div>
                </div>
              </div>

              {/* Get Directions CTA */}
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=M5QC%2B8CX+General+Luna+Quezon"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-directions-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Get Directions
              </a>
            </div>

            {/* RIGHT — map */}
            <div className="contact-map-col">
              <div className="contact-map-wrap">
                <iframe
                  title="MCRO General Luna Location"
                  aria-label="Map showing MCRO office location"
                  src="https://maps.google.com/maps?q=M5QC%2B8CX+General+Luna+Quezon&output=embed&z=17"
                  width="100%"
                  height="100%"
                  style={{ border: 0, display: 'block' }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-gold-bar" />
        <div className="footer-body">

          {/* Col 1 — Brand */}
          <div className="footer-col footer-col-brand">
            <div className="footer-logo-row">
              <div className="footer-logo-ring">
                <img src="/logo.png" alt="MCRO" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
              </div>
              <div>
                <div className="footer-brand-name">Municipal Civil Registrar's Office</div>
                <div className="footer-brand-sub">General Luna, Quezon</div>
              </div>
            </div>
            <p className="footer-tagline">
              Maintaining accurate civil registration records for every resident of General Luna — from birth to marriage to death.
            </p>
            <a
              href="https://www.facebook.com/josel.genciana"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-btn"
            >
              <span className="footer-fb-icon">f</span>
              <span>MCRO General Luna</span>
            </a>
          </div>

          {/* Col 2 — Quick Links */}
          <div className="footer-col">
            <div className="footer-col-title">Quick Links</div>
            {[
              ['Services', 'services'],
              ['Records', 'records'],
              ['FAQ', 'faq'],
              ['Our Team', 'orgchart'],
              ['Contact & Location', 'contact'],
            ].map(([label, id]) => (
              <button key={label} onClick={() => smoothScrollTo(id)} className="footer-link">{label}</button>
            ))}
          </div>

             {/* Col 3 — Contact */}
          <div className="footer-col">
            <div className="footer-col-title">Contact</div>
            <div className="footer-info-row">
              <span className="footer-info-icon" aria-hidden="true">📍</span>
              <span className="footer-info-text">M5QC+8CX, Jacinto, Poblacion, General Luna, Quezon</span>
            </div>
            <div className="footer-info-row" style={{ alignItems: 'flex-start' }}>
              <span className="footer-info-icon" aria-hidden="true">🕐</span>
              <div>
                <span className="footer-open-badge">Mon – Thurs open</span>
                <div className="footer-hours-grid">
                  <span className="footer-day">Mon – Thurs</span><span className="footer-time">7:00 AM – 5:00 PM</span>
                  <span className="footer-day">Fri – Sun</span><span className="footer-time">Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 4 — Live Queue */}
          <div className="footer-col">
            <div className="footer-col-title">Live Queue</div>
            <QueueDisplay mini />
          </div>

        </div>

        {/* Disclaimer */}
        <div className="footer-disclaimer-wrap">
          <div className="footer-disclaimer-inner">
            <span className="footer-disclaimer-label">⚠ Disclaimer</span>
            <p className="footer-disclaimer-text">
              The information provided on this website is for general guidance purposes only and does not constitute official legal advice. Fees, processing times, and requirements are subject to change without prior notice — please visit the MCRO office or contact us directly for the most current information. In compliance with <strong>Republic Act No. 10173</strong> (Data Privacy Act of 2012), any personal information collected through this system is strictly used for civil registration purposes and is safeguarded against unauthorized access, use, or disclosure.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <span className="footer-copy">© {new Date().getFullYear()} Municipal Civil Registrar's Office · All rights reserved</span>
          <div className="footer-affiliations">
            <a href="https://psa.gov.ph" target="_blank" rel="noopener noreferrer" className="footer-aff-badge footer-aff-link">PSA</a>
            <a href="https://philsys.gov.ph" target="_blank" rel="noopener noreferrer" className="footer-aff-badge footer-aff-link">PhilSys</a>
            <a href="https://generallunaquezon.gov.ph/" target="_blank" rel="noopener noreferrer" className="footer-aff-badge footer-aff-link">LGU General Luna</a>
          </div>
          <button className="footer-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            ↑ Back to top
          </button>
        </div>
      </footer>
    </div>
    </>
  );
}