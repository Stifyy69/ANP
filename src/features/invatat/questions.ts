export const ANP_REGULATION_URL = "https://wiki.ogland.ro/ro/Regulamente/Factiuni/Regulament-ANP";

export type LearningPage = {
  title: string;
  content: string;
};

export type TestQuestion = {
  id: string;
  category: string;
  question: string;
  answer: string;
  accepted: string[];
};

export const learningPages: LearningPage[] = [
  {
    title: "Agent Operativ",
    content: [
      "Agentul Operativ este responsabil de supravegherea directa a detinutilor si de mentinerea unui mediu sigur.",
      "",
      "• Asigura ordinea in toate zonele penitenciarului.",
      "• Verifica permanent ca usile sa fie inchise corespunzator.",
      "• Poate scoate la aer maximum 2 detinuti odata.",
      "• Detinutii scosi la aer trebuie supravegheati in permanenta.",
      "• Callsign-urile Agentilor Operativi incep de la P-51.",
    ].join("\n"),
  },
  {
    title: "Agent Operativ Sef",
    content: [
      "Agentul Operativ Sef organizeaza echipa de paza si mentine ordinea generala in penitenciar.",
      "",
      "• Organizeaza regruparile.",
      "• Poate declara regim inchis.",
      "• Poate prelungi sentinta unui detinut.",
      "• Poate organiza iesiri in grup cu un numar mai mare de detinuti.",
      "• Daca trimite un detinut la carcera, trebuie sa noteze timpul si motivul in aplicatia penitenciarului.",
      "• Callsign-urile sunt P-20 pana la P-50.",
    ].join("\n"),
  },
  {
    title: "Supervizor si Director",
    content: [
      "Supervizorul Penitenciar organizeaza regruparile, solutioneaza conflictele dintre detinuti si problemele de abuz ale gradelor inferioare.",
      "",
      "• Director Penitenciar: P-01, P-02, P-03, P-04.",
      "• Supervizor Penitenciar: P-05, P-06, P-07 si urmatoarele pana la Agent Operativ Sef.",
    ].join("\n"),
  },
  {
    title: "Reguli generale",
    content: [
      "• Usile trebuie sa ramana inchise, mai ales in timpul transporturilor.",
      "• La datorie, statia trebuie pornita pe frecventa 23.",
      "• Taserul nu se foloseste in toaletele penitenciarului.",
      "• La un transport cu 10 sau mai multe persoane se aplica automat regim inchis.",
      "• Detinutul dus la infirmerie trebuie incatusat, chiar daca este inconstient.",
      "• Nu se intervine in actiunile Politiei.",
      "• In batai sau revolte se intervine doar dupa ce acestea s-au incheiat.",
      "• Bastonul poate fi folosit pentru autoaparare daca agentul este lovit.",
      "• Taserul poate fi folosit pentru autoaparare sau daca detinutii nu se conformeaza.",
    ].join("\n"),
  },
  {
    title: "Carcera si prelungiri",
    content: [
      "Agentul Operativ Sef poate trimite un detinut la carcera si poate prelungi sentinta conform grilei.",
      "",
      "10-20 luni: neconformare la ordin, jignirea/provocarea/lovirea altor detinuti.",
      "20-40 luni: injurii angajatilor, loviri repetate, lovirea unui detinut pana la coma.",
      "40-60 luni: organizarea revoltelor in masa, lovirea unui agent pana la coma.",
    ].join("\n"),
  },
  {
    title: "Vizite",
    content: [
      "• Program zilnic: 18:00 - 00:00.",
      "• Durata maxima: 10 minute.",
      "• Un detinut are dreptul la o singura vizita pe durata detentiei.",
      "• Accesul este permis familiei, persoanelor apropiate si avocatilor.",
      "• Vizitatorul trebuie sa prezinte un act de identitate valabil si este supus controlului de securitate.",
      "• Schimbul de obiecte/bani si fotografierea sau filmarea sunt interzise.",
      "• Personalul poate opri vizita in caz de abatere.",
    ].join("\n"),
  },
  {
    title: "Transporturi",
    content: [
      "• Agentul Operativ participa la transport atunci cand este solicitat de Politie.",
      "• Un agent poate transporta maximum 2 detinuti.",
      "• Detinutii raman incatusati pe toata durata transportului.",
      "• Pentru 3 sau mai multi detinuti se solicita un echipaj de politie pentru escorta.",
      "• Se respecta raportul de 1 agent la 2 detinuti.",
      "• La 10 detinuti trebuie sa ramana minimum 5 agenti in penitenciar.",
      "• Orice transport trebuie notat obligatoriu in aplicatia penitenciarului.",
    ].join("\n"),
  },
  {
    title: "Promovari",
    content: [
      "Rank-up-ul se acorda duminica la ora 23:00.",
      "",
      "Agent Operativ -> Agent Operativ Sef:",
      "• minimum 7 zile vechime",
      "• minimum 10 ore de pontaj pe saptamana",
      "• fara sanctiuni active",
      "",
      "Agent Operativ Sef -> Supervizor Penitenciar:",
      "• minimum 21 zile vechime",
      "• minimum 10 ore de pontaj pe saptamana",
      "• fara sanctiuni active",
      "• implicare activa in penitenciar",
    ].join("\n"),
  },
];

export const testQuestions: TestQuestion[] = [
  {
    id: "transport-max",
    category: "Transporturi",
    question: "Un Agent Operativ poate transporta maximum cati detinuti?",
    answer: "Maximum 2 detinuti.",
    accepted: ["2", "doi", "2 detinuti", "doi detinuti", "maximum 2", "maxim 2"],
  },
  {
    id: "radio-frequency",
    category: "Reguli generale",
    question: "Pe ce frecventa trebuie sa fie conectat agentul atunci cand este la datorie?",
    answer: "Frecventa 23.",
    accepted: ["23", "frecventa 23", "pe 23"],
  },
  {
    id: "taser-toalete",
    category: "Reguli generale",
    question: "Este permis sa folosesti taserul in toaletele penitenciarului? Scrie da sau nu.",
    answer: "Nu. Folosirea taserului in toaletele penitenciarului este interzisa.",
    accepted: ["nu"],
  },
  {
    id: "transport-regim-inchis",
    category: "Reguli generale",
    question: "De la cate persoane intr-un transport se aplica automat regim inchis?",
    answer: "De la 10 persoane in sus.",
    accepted: ["10", "10 persoane", "10+", "de la 10", "10 sau mai multe"],
  },
  {
    id: "infirmerie",
    category: "Reguli generale",
    question: "Cum trebuie dus un detinut la infirmerie, inclusiv daca este inconstient?",
    answer: "Detinutul trebuie sa fie incatusat.",
    accepted: ["incatusat", "incatusat permanent", "cu catuse", "trebuie incatusat"],
  },
  {
    id: "revolta-interventie",
    category: "Reguli generale",
    question: "Cand au voie agentii sa intervina intr-o bataie sau revolta?",
    answer: "Doar dupa ce bataia sau revolta s-a incheiat.",
    accepted: ["dupa ce s-a incheiat", "dupa ce se termina", "la final", "dupa terminare", "doar dupa ce s-a incheiat"],
  },
  {
    id: "vizite-program",
    category: "Vizite",
    question: "Care este programul zilnic al vizitelor?",
    answer: "Intre 18:00 si 00:00.",
    accepted: ["18:00-00:00", "18 00 - 00 00", "18:00 si 00:00", "18:00 pana la 00:00", "18-00"],
  },
  {
    id: "vizite-durata",
    category: "Vizite",
    question: "Care este durata maxima a unei vizite?",
    answer: "Maximum 10 minute.",
    accepted: ["10", "10 minute", "maximum 10 minute", "maxim 10 minute"],
  },
  {
    id: "vizite-numar",
    category: "Vizite",
    question: "Cate vizite poate primi un detinut pe durata detentiei?",
    answer: "O singura vizita.",
    accepted: ["1", "una", "o vizita", "o singura vizita"],
  },
  {
    id: "transport-escorta",
    category: "Transporturi",
    question: "De la cati detinuti este obligatoriu sa soliciti un echipaj de politie pentru escorta?",
    answer: "De la 3 detinuti in sus.",
    accepted: ["3", "3 detinuti", "de la 3", "3 sau mai multi", "3+"],
  },
  {
    id: "raport-agenti-detinuti",
    category: "Transporturi",
    question: "Care este raportul obligatoriu dintre agenti si detinuti?",
    answer: "1 agent la 2 detinuti.",
    accepted: ["1 la 2", "1 agent la 2 detinuti", "1/2", "un agent la doi detinuti"],
  },
  {
    id: "zece-detinuti",
    category: "Transporturi",
    question: "Daca sunt 10 detinuti in penitenciar, cati agenti trebuie sa ramana minimum pentru supraveghere?",
    answer: "Minimum 5 agenti.",
    accepted: ["5", "5 agenti", "minimum 5", "minim 5"],
  },
  {
    id: "transport-aplicatie",
    category: "Transporturi",
    question: "Unde trebuie notat obligatoriu orice transport?",
    answer: "In aplicatia destinata penitenciarului.",
    accepted: ["in aplicatie", "aplicatia penitenciarului", "in aplicatia penitenciarului", "pe aplicatie"],
  },
  {
    id: "carcera-neconformare",
    category: "Carcera",
    question: "Ce interval de luni poate fi adaugat pentru neconformare la ordinul unui Agent Operativ?",
    answer: "Intre 10 si 20 de luni.",
    accepted: ["10-20", "10 20", "10-20 luni", "intre 10 si 20", "10 pana la 20"],
  },
  {
    id: "carcera-revolta",
    category: "Carcera",
    question: "Ce interval de luni poate fi adaugat pentru organizarea revoltelor in masa?",
    answer: "Intre 40 si 60 de luni.",
    accepted: ["40-60", "40 60", "40-60 luni", "intre 40 si 60", "40 pana la 60"],
  },
  {
    id: "carcera-notare",
    category: "Carcera",
    question: "Ce trebuie sa noteze un Agent Operativ Sef atunci cand trimite un detinut la carcera?",
    answer: "Timpul si motivul, in aplicatia destinata penitenciarului.",
    accepted: ["timpul si motivul", "timp si motiv", "durata si motivul", "motivul si timpul", "motiv si timp"],
  },
  {
    id: "masina-penitenciar",
    category: "Reguli generale",
    question: "Pentru ce poate fi folosita masina penitenciarului?",
    answer: "Pentru transporturi sau pentru cumpararea de alimente/apa din apropiere.",
    accepted: ["transporturi si alimente apa", "transport si cumparat mancare apa", "transporturi sau cumpararea de alimente", "transporturi sau alimente", "transport si mancare apa"],
  },
  {
    id: "munca-catuse",
    category: "Reguli generale",
    question: "Cum trebuie sa fie detinutii in timpul transportului catre locul de munca si inapoi?",
    answer: "Trebuie sa fie incatusati.",
    accepted: ["incatusati", "cu catuse", "trebuie incatusati"],
  },
];
