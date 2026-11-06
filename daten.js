/*
 * Golfreise Tunesien 2026 – alle Termine an einer Stelle.
 *
 * Diese Datei ist die einzige, die du für Änderungen anfassen musst.
 * Danach `node kalender.mjs` ausführen, damit die .ics-Dateien neu entstehen.
 *
 * Felder pro Programmpunkt (items):
 *   t     Uhrzeit "HH:MM" (leer lassen, wenn es keine gibt)
 *   x     Text
 *   ab    true  -> wird als "ab 9:00" angezeigt
 *   key   true  -> hervorgehoben (z. B. Teambesprechung für alle)
 *   go    true  -> Beginn des Golftags im Kalender (Bustransfer)
 *   back  true  -> Ende des Golftags im Kalender (Abholung)
 *   eve   true  -> Beginn des Abendtermins im Kalender
 *   bis   "HH:MM" -> Ende des Abendtermins (sonst 3 Stunden)
 */

const REISE = {
  titel: "Golfreise Tunesien 2026",
  hinweis: "Änderungen können – müssen aber nicht – vorkommen!",
  zeitzone: "Africa/Tunis",
  rueckflug: "Flug nach Köln, Abholung ca. 18:00 Uhr",

  // Ergebnisse Schwarz gegen Rot: hier nach jedem Spieltag eintragen,
  // z. B. stand: { schwarz: 3, rot: 2 }. null = noch nichts gespielt.
  stand: null,

  // Travel Open: Sieger nach der Siegerehrung eintragen, z. B. "Erika Muster"
  sieger: null,

  wochen: [
    {
      id: "travel-open",
      name: "Travel Open",
      von: "2026-11-07",
      bis: "2026-11-14",
      untertitel: "Fünf Turniertage, ein Wanderpokal.",
      tage: [
        {
          datum: "2026-11-07",
          art: "anreise",
          titel: "Anreise",
          items: [
            { x: "Anreise, Einchecken im Hotel, Willkommen" },
            { x: "Ausklang an der Bar" }
          ]
        },
        {
          datum: "2026-11-08",
          art: "golf",
          titel: "Scramble Stableford",
          platz: "GC Oliver",
          formen: ["scramble", "stableford"],
          items: [
            { t: "09:00", ab: true, x: "Frühstück" },
            { t: "10:00", go: true, x: "Privater Bustransfer zum GC Oliver" },
            { t: "10:20", key: true, x: "Teambesprechung auf der Range – alle!" },
            { x: "Gemeinsames Dehnen, Einschlagen auf der Range, Putten" },
            { t: "11:58", tee: true, x: "Abschlag Scramble Stableford" },
            { t: "17:45", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "19:30", eve: true, x: "Treffen an der Bar – Siegerehrung – Abendessen" },
            { x: "Ausklang an der Bar" }
          ],
          abschlag: { label: "Team", zeiten: ["11:58", "12:06", "12:14", "12:22", "12:30"] }
        },
        {
          datum: "2026-11-09",
          art: "golf",
          titel: "Auswahl-Drive & Klassischer Vierer",
          platz: "GC Foret",
          formen: ["auswahldrive", "vierer", "stableford"],
          zusatz: "9 Loch Auswahl-Drive + 9 Loch Klassischer Vierer, Stableford im 2er-Team",
          motto: "„Die schützende Hand Hamsa“ – der Glücksbringer",
          items: [
            { t: "09:00", ab: true, x: "Frühstück" },
            { t: "10:15", go: true, x: "Privater Bustransfer zum GC Foret" },
            { t: "10:30", x: "Gemeinsames Dehnen, Einschlagen auf der Range, Putten" },
            { t: "11:58", tee: true, x: "Abschlag: 9 Loch Auswahl-Drive + 9 Loch Klassischer Vierer" },
            { t: "17:45", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "19:30", eve: true, x: "Treffen an der Bar – Siegerehrung – Abendessen" },
            { x: "Ausklang an der Bar" }
          ],
          abschlag: { label: "Team", zeiten: ["11:58", "12:06", "12:14", "12:22", "12:30"] }
        },
        {
          datum: "2026-11-10",
          art: "frei",
          titel: "Freier Tag",
          liste: [
            "Einige von euch spielen Golf",
            "Einige spannen aus und genießen das Meer",
            "Einige erleben die Angebote vom Magic Club",
            "Einige lassen sich bei einer Massage verwöhnen"
          ],
          items: [
            { t: "18:30", eve: true, x: "Treffen an der Bar, Abendessen" },
            { x: "Ausklang an der Bar" }
          ]
        },
        {
          datum: "2026-11-11",
          art: "ausflug",
          titel: "Ausflug El Djem & Kairouan",
          motto: "Kölle Alaaf!",
          liste: ["Kolosseum El Djem", "Moschee Kairouan"],
          wichtig: "Kein Mittagessen unterwegs – vorher im Hotel essen. Verpflegung und Getränke bitte selbst mitnehmen.",
          items: [
            { t: "18:30", eve: true, x: "Treffen an der Bar, Abendessen" },
            { x: "Ausklang an der Bar" }
          ]
        },
        {
          datum: "2026-11-12",
          art: "golf",
          titel: "Bingo Golf",
          platz: "GC Oliver",
          formen: ["bingo", "einzel"],
          zusatz: "Einzel",
          items: [
            { t: "08:30", ab: true, x: "Frühstück" },
            { t: "09:45", go: true, x: "Privater Bustransfer zum GC Oliver" },
            { t: "10:00", x: "Gemeinsames Dehnen, Einschlagen auf der Range, Putten" },
            { t: "11:34", tee: true, x: "Abschlag Bingo Golf Einzel" },
            { t: "17:30", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "19:00", eve: true, x: "Treffen an der Bar – Siegerehrung – Abendessen" },
            { x: "Ausklang an der Bar" }
          ],
          abschlag: { label: "Team", zeiten: ["11:34", "11:42", "11:50", "11:58", "12:06"] }
        },
        {
          datum: "2026-11-13",
          art: "golf",
          titel: "Wünsch dir was!",
          platz: "GC Foret",
          formen: ["wuenschdirwas", "scramble", "einzel", "vierer", "auswahldrive"],
          zusatz: "Scramble, Einzel, Klassischer Vierer, Auswahl-Drive",
          finale: true,
          items: [
            { t: "08:00", ab: true, x: "Frühstück" },
            { t: "09:45", go: true, x: "Privater Bustransfer zum GC Foret" },
            { t: "10:00", x: "Gemeinsames Dehnen, Einschlagen auf der Range, Putten" },
            { t: "11:34", tee: true, x: "Abschlag „Wünsch dir was!“" },
            { t: "17:30", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "18:45", eve: true, bis: "23:59", key: true, x: "Treffen an der Bar – Siegerehrung: Wer wird Travel-Open-Sieger? Vergabe des Wanderpokals" },
            { t: "19:15", x: "Gala-Abend" },
            { x: "Große Party an der Bar – wir feiern den neuen Travel-Open-Sieger. Offenes Ende." }
          ],
          abschlag: { label: "Team", zeiten: ["11:34", "11:42", "11:50", "11:58", "12:06"] }
        },
        {
          datum: "2026-11-14",
          art: "abreise",
          titel: "Abreise",
          items: [
            { x: "Frühstück, Auschecken" },
            { x: "Gegebenenfalls die letzten warmen Sonnenstrahlen genießen" },
            { x: "Großer tränenreicher Abschied – auf Wiedersehen, bis bald und auf die Revanche 2027!" },
            { t: "18:00", x: "Abholung zum Flug nach Köln (ca.)", flug: true }
          ]
        }
      ]
    },

    {
      id: "schwarz-gegen-rot",
      name: "Schwarz gegen Rot",
      von: "2026-11-14",
      bis: "2026-11-21",
      untertitel: "Zwei Teams, fünf Spieltage, ein Golf-Präsident.",
      tage: [
        {
          datum: "2026-11-14",
          art: "anreise",
          titel: "Anreise",
          geburtstag: "Michael Breuer",
          items: [
            { x: "Anreise, Einchecken im Hotel, Willkommen" },
            { x: "Ausklang an der Bar" }
          ]
        },
        {
          datum: "2026-11-15",
          art: "golf",
          titel: "Scramble Stableford",
          platz: "GC Oliver",
          formen: ["scramble", "stableford", "sonderpreise"],
          geburtstag: "Sabine Thürmel",
          sonderpreise: {
            von: "Sabine",
            preise: ["Longest Drive Damen & Herren an Loch 8", "Nearest to the Pin an Loch 4"]
          },
          items: [
            { t: "08:00", ab: true, x: "Frühstück" },
            { t: "09:15", go: true, x: "Privater Bustransfer zum GC Oliver" },
            { t: "09:30", key: true, x: "Teambesprechung auf der Range – alle!" },
            { x: "Gemeinsames Dehnen, Einschlagen auf der Range, Putten" },
            { t: "11:02", tee: true, x: "Abschlag Scramble Stableford" },
            { t: "17:00", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "19:00", eve: true, x: "Treffen an der Bar – Siegerehrung – Abendessen" },
            { x: "Ausklang an der Bar" }
          ],
          abschlag: { label: "Team", zeiten: ["11:02", "11:10", "11:18", "11:26", "11:36"] }
        },
        {
          datum: "2026-11-16",
          art: "golf",
          titel: "The Power of History",
          platz: "GC Foret",
          formen: ["stablefordlwsp", "einzel"],
          zusatz: "Stableford-Lochwettspiel Einzel",
          items: [
            { t: "08:00", ab: true, x: "Frühstück" },
            { t: "09:30", go: true, x: "Privater Bustransfer zum GC Foret" },
            { t: "10:00", x: "Gemeinsames Dehnen, Einschlagen auf der Range, Putten" },
            { t: "10:54", tee: true, x: "Abschlag „The Power of History“ – Stableford-Lochwettspiel Einzel" },
            { t: "17:00", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "19:00", eve: true, x: "Treffen an der Bar – Siegerehrung – Abendessen" },
            { x: "Ausklang an der Bar" }
          ],
          abschlag: { label: "Flight", zeiten: ["10:54", "11:02", "11:10", "11:18", "11:26"] }
        },
        {
          datum: "2026-11-17",
          art: "golf",
          titel: "Chapman-Vierer",
          platz: "GC Jasmin",
          formen: ["chapman", "stablefordlwsp"],
          zusatz: "Stableford-Lochwettspiel",
          motto: "Die Eroberung der Gebiete von Karthago",
          items: [
            { t: "08:00", ab: true, x: "Frühstück" },
            { t: "09:30", go: true, x: "Privater Bustransfer zum GC Jasmin" },
            { t: "10:00", x: "Gemeinsames Dehnen, Einschlagen auf der Range, Putten, Teambesprechung" },
            { t: "11:00", tee: true, x: "Abschlag „Chapman-Vierer“ – Stableford-Lochwettspiel" },
            { t: "17:15", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "19:15", eve: true, x: "Treffen an der Bar – Siegerehrung – Abendessen" },
            { x: "Ausklang an der Bar" }
          ],
          abschlag: { label: "Team", zeiten: ["11:00", "11:08", "11:16", "11:24", "11:32"] }
        },
        {
          datum: "2026-11-18",
          art: "frei",
          titel: "Freier Tag",
          liste: [
            "Einige von euch spielen Golf",
            "Einige spannen aus und genießen das Meer",
            "Einige erleben die Angebote vom Magic Club",
            "Einige lassen sich bei einer Massage verwöhnen"
          ],
          items: [
            { t: "18:30", eve: true, x: "Treffen an der Bar, Abendessen" },
            { x: "Ausklang an der Bar" }
          ]
        },
        {
          datum: "2026-11-19",
          art: "golf",
          titel: "Lochwettspiel im 2er-Team",
          platz: "GC Oliver",
          formen: ["lochwettspiel", "auswahldrive", "vierer"],
          zusatz: "9 Loch Auswahl-Drive + 9 Loch Klassischer Vierer",
          items: [
            { t: "08:00", ab: true, x: "Frühstück" },
            { t: "09:00", go: true, x: "Privater Bustransfer zum GC Oliver" },
            { t: "09:30", x: "Gemeinsames Dehnen, Einschlagen auf der Range, Putten" },
            { t: "10:30", tee: true, x: "Abschlag Lochwettspiel 2er-Team: 9 Loch Auswahl-Drive + 9 Loch Klassischer Vierer" },
            { t: "16:30", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "19:00", eve: true, x: "Treffen an der Bar – Siegerehrung – Abendessen" },
            { x: "Ausklang an der Bar" }
          ],
          abschlag: { label: "Team", zeiten: ["10:30", "10:38", "10:46", "10:54", "11:02"] }
        },
        {
          datum: "2026-11-20",
          art: "golf",
          titel: "Kampf der Titanen",
          platz: "GC Foret",
          formen: ["lochwettspiel", "einzel"],
          zusatz: "Lochwettspiel Einzel – Schwarz gegen Rot",
          finale: true,
          items: [
            { t: "08:00", ab: true, x: "Frühstück" },
            { t: "09:00", go: true, x: "Privater Bustransfer zum GC Foret" },
            { t: "09:30", x: "Gemeinsames Dehnen, Einschlagen auf der Range, Putten" },
            { t: "10:30", tee: true, x: "Abschlag „Kampf der Titanen“ – Lochwettspiel Einzel, Schwarz gegen Rot" },
            { t: "16:30", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "18:30", eve: true, bis: "23:59", key: true, x: "Treffen an der Bar – Siegerehrung: Welches Team hat gewonnen? Kürung des Golf-Präsidenten" },
            { t: "19:00", x: "Gala-Abend" },
            { x: "Große Party an der Bar – wir feiern die Siegergruppe. Offenes Ende." }
          ],
          abschlag: { label: "Flight", zeiten: ["10:30", "10:38", "10:46", "10:54", "11:02"] }
        },
        {
          datum: "2026-11-21",
          art: "abreise",
          titel: "Abreise",
          items: [
            { x: "Frühstück, Auschecken" },
            { x: "Gegebenenfalls die letzten warmen Sonnenstrahlen genießen" },
            { x: "Großer tränenreicher Abschied – auf Wiedersehen, bis bald und auf die Revanche 2027!" },
            { t: "18:00", x: "Abholung zum Flug nach Köln (ca.)", flug: true }
          ]
        }
      ]
    }
  ],

  // Kurze Erklärungen, die unter jedem Golftag aufklappen
  spielformen: {
    scramble: ["Scramble", "Alle im Team schlagen ab, der beste Ball wird gewählt, und alle spielen von dort weiter – Schlag für Schlag, bis der Ball im Loch ist."],
    stableford: ["Stableford", "Gezählt werden Punkte statt Schläge, mit Vorgabe: Netto-Bogey 1 Punkt, Netto-Par 2, Netto-Birdie 3. Ein verkorkstes Loch bringt null Punkte, mehr kostet es nicht."],
    auswahldrive: ["Auswahl-Drive", "Beide Partner schlagen ab, das Team wählt den besseren Drive. Ab dort wird mit einem Ball abwechselnd weitergespielt."],
    vierer: ["Klassischer Vierer", "Zwei Spieler, ein Ball, abwechselnd geschlagen. Am Abschlag wechselt man sich ab: einer an den ungeraden, der andere an den geraden Löchern."],
    chapman: ["Chapman-Vierer", "Beide schlagen ab und spielen den zweiten Schlag mit dem Ball des Partners. Danach wird der bessere Ball gewählt und abwechselnd zu Ende gespielt."],
    lochwettspiel: ["Lochwettspiel", "Gespielt wird Loch für Loch gegeneinander. Wer ein Loch gewinnt, holt es – am Ende zählen die gewonnenen Löcher, nicht die Gesamtschläge."],
    stablefordlwsp: ["Stableford-Lochwettspiel", "Lochwettspiel mit Vorgabe: Das Loch gewinnt, wer dort mehr Stableford-Punkte holt. Am Ende zählen die gewonnenen Löcher."],
    einzel: ["Einzel", "Jeder spielt seinen eigenen Ball."],
    bingo: ["Bingo Golf", "Nein, nicht Bingo Bango Bongo! Was hinter Bingo Golf steckt, bleibt bis zum ersten Abschlag eine Überraschung."],
    wuenschdirwas: ["Wünsch dir was!", "Ein Mix aus Scramble, Einzel, Klassischem Vierer und Auswahl-Drive."],
    sonderpreise: ["Sonderpreise", "Longest Drive: der längste Abschlag, der auf dem Fairway liegen bleibt. Nearest to the Pin: der Abschlag, der am nächsten an der Fahne liegt."]
  }
};

if (typeof module !== "undefined") module.exports = REISE;
