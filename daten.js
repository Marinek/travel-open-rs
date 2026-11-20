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
 *
 * Abschlag (abschlag) – nach dem Spieltag als Tagebuch ergänzen:
 *   teams    [["Vorname", …], …] -> wer in welchem Team/Flight gespielt hat
 *   ergebnis { 3: "1. Platz Brutto", 5: "1. Platz Netto" } -> Teamnummer: Platzierung
 *            (beginnt der Text mit "1.", gibt es den Pokal und die gelbe Hervorhebung)
 *            An Paar-Tagen kann statt der Teamnummer das Paar stehen:
 *            { "Karin + Melli": "1. Platz Brutto" }
 *   punkte   { 3: 1, "Anja + Lisa": 2 } -> Punkte für die Gesamtwertung, jeder Spieler
 *            des Teams/Paares bekommt sie. Die Tabelle oben rechnet sich daraus selbst.
 *   notiz    "…" -> kurzer Vermerk unter den Flights (z. B. wer verletzt ist oder Caddy macht)
 *   2er-Teams schreibt man "Vorname + Vorname"; ein Name ohne Partner = spielt allein
 */

const REISE = {
  titel: "Golfreise Tunesien 2026",
  hinweis: "Änderungen können – müssen aber nicht – vorkommen!",
  zeitzone: "Africa/Tunis",
  rueckflug: "Flug nach Köln, Abholung ca. 18:00 Uhr",

  // Ergebnisse Schwarz gegen Rot: werden aus abschlag.duell der Spieltage
  // berechnet. Nur zum Überschreiben, z. B. stand: { schwarz: 3, rot: 2 }.
  stand: null,

  // Travel Open: Sieger nach der Siegerehrung eintragen, z. B. "Erika Muster"
  sieger: "Melli (nach einem Stechen)",

  // Fotos (eigene Seite fotos.html): Adresse des Cloud-Run-Dienstes,
  // gibt fotos-dienst/setup.sh aus. Leer = Fotoseite zeigt „noch nicht eingerichtet“.
  fotos: { dienst: "https://fotos-dienst-zddr4hc3fa-ey.a.run.app" },

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
          abschlag: {
            label: "Team", zeiten: ["11:58", "12:06", "12:14", "12:22", "12:30"],
            // Tagebuch: wer in welchem Team gespielt hat (gleiche Reihenfolge wie zeiten)
            teams: [
              ["Patrick", "Karin", "Hardy", "Kerstin"],
              ["Boscho", "Stefan", "Markus", "Volker"],
              ["Martin", "Carlos", "Peter", "Dirk"],
              ["Magret", "Monika", "Susanne"],
              ["Anja", "Lisa", "Frauke", "Melli"]
            ],
            // Ergebnis: Teamnummer -> Platzierung
            ergebnis: { 3: "1. Platz Brutto", 5: "1. Platz Netto" },
            // Punkte für die Gesamtwertung (jeder Spieler des Teams bekommt sie)
            punkte: { 3: 1, 5: 1 }
          }
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
            { t: "11:42", tee: true, x: "Abschlag (rechter Abschlag): 9 Loch Auswahl-Drive + 9 Loch Klassischer Vierer" },
            { t: "17:45", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "19:30", eve: true, x: "Treffen an der Bar – Siegerehrung – Abendessen" },
            { x: "Ausklang an der Bar" }
          ],
          abschlag: {
            label: "Flight", zeiten: ["11:42", "11:50", "11:58", "12:06", "12:14"],
            // 2er-Teams, je zwei pro Flight (Patrick spielt einzeln mit)
            teams: [
              ["Patrick", "Dirk + Markus"],
              ["Karin + Melli", "Volker + Peter"],
              ["Stefan + Kerstin", "Magret + Boscho"],
              ["Martin + Frauke", "Carlos + Susanne"],
              ["Monika + Hardy", "Anja + Lisa"]
            ],
            ergebnis: { "Anja + Lisa": "1. Platz", "Karin + Melli": "2. Platz" },
            punkte: { "Anja + Lisa": 2, "Karin + Melli": 1 }
          }
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
            { t: "11:34", tee: true, x: "Abschlag (linker Abschlag): Bingo Golf Einzel" },
            { t: "17:30", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "19:00", eve: true, x: "Treffen an der Bar – Siegerehrung – Abendessen" },
            { x: "Ausklang an der Bar" }
          ],
          abschlag: {
            label: "Flight", zeiten: ["11:34", "11:42", "11:50", "11:58", "12:06"],
            teams: [
              ["Boscho", "Peter", "Patrick"],
              ["Martin", "Lisa", "Karin", "Melli"],
              ["Dirk", "Stefan", "Frauke", "Anja"],
              ["Carlos", "Volker", "Markus"],
              ["Magret", "Monika", "Susanne", "Hardy"]
            ],
            notiz: "Kerstin ist verletzt und läuft als Caddy bei Stefan (Flight 3) mit. Gute Besserung, Kerstin!",
            ergebnis: {
              "Melli": "1. Platz (geteilt)", "Dirk": "1. Platz (geteilt)",
              "Frauke": "3. Platz", "Stefan": "4. Platz – toller Preis 🎁"
            },
            punkte: { "Melli": 2, "Dirk": 2, "Frauke": 1 }
          }
        },
        {
          datum: "2026-11-13",
          art: "golf",
          titel: "Travel Open Finale",
          platz: "GC Foret",
          formen: ["scramble"],
          zusatz: "Scramble in allen Flights",
          finale: true,
          items: [
            { t: "08:00", ab: true, x: "Frühstück" },
            { t: "09:45", go: true, x: "Privater Bustransfer zum GC Foret" },
            { t: "10:00", x: "Gemeinsames Dehnen, Einschlagen auf der Range, Putten" },
            { t: "11:34", tee: true, x: "Abschlag Travel Open Finale – Scramble" },
            { t: "17:30", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "18:45", eve: true, bis: "23:59", key: true, x: "Treffen an der Bar – Siegerehrung: Melli gewinnt nach einem Stechen die Travel Open 2026 🏆 und den Wanderpokal" },
            { t: "19:15", x: "Gala-Abend" },
            { x: "Große Party an der Bar – wir feiern unsere Travel-Open-Siegerin Melli. Offenes Ende." }
          ],
          abschlag: {
            label: "Flight",
            zeiten: ["11:34", "11:42", "11:50", "11:58", "12:06"],
            teams: [
              ["Melli", "Karin", "Anja", "Dirk"],
              ["Lisa", "Patrick", "Martin"],
              ["Frauke", "Susanne", "Peter"],
              ["Stefan", "Monika", "Hardy", "Magret"],
              ["Boscho", "Volker", "Carlos", "Markus"]
            ],
            ergebnis: { 3: "1. Platz", 2: "2. Platz" },
            punkte: { 3: 2, 2: 1 },
            stechen: "Melli", // Gleichstand an der Spitze – Melli hat das Stechen gewonnen
            notiz: "🏆 Travel-Open-Siegerin 2026: Melli – Frauke, Lisa und Melli lagen mit je 4 Punkten gleichauf, Melli hat das Stechen gewonnen! Kerstin war verletzt und konnte nicht mitspielen."
          }
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
      untertitel: "Zwei Teams, fünf Spieltage – und am Ende eine Golf-Präsidentin oder ein Golf-Präsident.",
      // Wer spielt für welches Team? Paare in den Flights werden danach eingefärbt.
      kader: {
        schwarz: ["Michael B.", "Stefan", "Michael W.", "Dirk", "Uli", "Jascha", "Martin", "Gudrun", "Friederike", "Heike"],
        rot: ["Petra", "Gerd", "Dani", "Anja", "Marion", "Volker", "Mike", "Mary", "Sabine", "Thomas"]
      },
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
          abschlag: {
            label: "Flight",
            zeiten: ["11:02", "11:10", "11:18", "11:26", "11:36"],
            teams: [
              ["Petra + Gerd", "Michael B. + Stefan"],
              ["Dani + Anja", "Michael W. + Dirk"],
              ["Marion + Volker", "Uli + Jascha"],
              ["Mike + Mary", "Martin + Gudrun"],
              ["Sabine + Thomas", "Friederike + Heike"]
            ],
            // Schwarz gegen Rot: wer hat den Flight gewonnen? "schwarz", "rot" oder
            // "unentschieden" (dann bekommen beide Teams einen Punkt). Ein Sieg = 1 Punkt.
            duell: ["schwarz", "rot", "rot", "unentschieden", "schwarz"]
          },
          // Präsidentschafts-Wertung (einzeln): Punkte des Tages pro Person –
          // für jede gespielte 5 gibt es einen Punkt. Namen wie im kader.
          praesident: {
            "Dirk": 9, "Michael W.": 9, "Michael B.": 5, "Friederike": 8, "Heike": 8,
            "Stefan": 5, "Martin": 4, "Gudrun": 4, "Jascha": 6, "Uli": 6,
            "Volker": 8, "Marion": 8, "Gerd": 5, "Mary": 9, "Thomas": 11,
            "Anja": 6, "Sabine": 11, "Mike": 9, "Dani": 6, "Petra": 5
          }
        },
        {
          datum: "2026-11-16",
          art: "golf",
          titel: "Scramble Stableford",
          platz: "GC Foret",
          formen: ["scramble", "stableford"],
          items: [
            { t: "08:00", ab: true, x: "Frühstück" },
            { t: "09:30", go: true, x: "Privater Bustransfer zum GC Foret" },
            { t: "10:00", x: "Gemeinsames Dehnen, Einschlagen auf der Range, Putten" },
            { t: "10:54", tee: true, x: "Abschlag Scramble Stableford" },
            { t: "17:00", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "19:00", eve: true, x: "Treffen an der Bar – Siegerehrung – Abendessen" },
            { x: "Ausklang an der Bar" }
          ],
          abschlag: {
            label: "Flight",
            zeiten: ["10:54", "11:02", "11:10", "11:18", "11:26"],
            teams: [
              ["Thomas + Mike", "Jascha + Martin"],
              ["Dani + Marion", "Uli + Heike"],
              ["Mary + Sabine", "Friederike + Dirk"],
              ["Gerd + Anja", "Gudrun + Michael B."],
              ["Volker + Petra", "Michael W. + Stefan"]
            ],
            duell: ["schwarz", "rot", "schwarz", "rot", "rot"]
          },
          praesident: {
            "Dirk": 7, "Michael W.": 10, "Michael B.": 7, "Friederike": 7, "Heike": 8,
            "Stefan": 10, "Martin": 3, "Gudrun": 7, "Jascha": 3, "Uli": 8,
            "Volker": 10, "Marion": 10, "Gerd": 4, "Mary": 8, "Thomas": 8,
            "Anja": 4, "Sabine": 8, "Mike": 8, "Dani": 10, "Petra": 10
          }
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
          abschlag: {
            label: "Team",
            zeiten: ["11:00", "11:08", "11:16", "11:24", "11:32"],
            teams: [
              ["Marion + Petra", "Friederike + Jascha"],
              ["Gerd + Volker", "Michael B. + Martin"],
              ["Dani + Thomas", "Heike + Uli"],
              ["Anja + Mary", "Michael W. + Gudrun"],
              ["Mike + Sabine", "Dirk + Stefan"]
            ],
            duell: ["rot", "schwarz", "unentschieden", "unentschieden", "schwarz"]
          },
          praesident: {
            "Dirk": 5, "Michael W.": 5, "Michael B.": 4, "Friederike": 5, "Heike": 6,
            "Stefan": 5, "Martin": 4, "Gudrun": 5, "Jascha": 5, "Uli": 6,
            "Volker": 4, "Marion": 7, "Gerd": 4, "Mary": 9, "Thomas": 9,
            "Anja": 9, "Sabine": 1, "Mike": 1, "Dani": 9, "Petra": 7
          }
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
            { t: "16:00", key: true, x: "Bogenschieß-Turnier 🏹" },
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
            { t: "10:30", tee: true, x: "Abschlag Lochwettspiel 2er-Team: 9 Loch Auswahl-Drive + 9 Loch Klassischer Vierer (linker Abschlag)" },
            { t: "16:30", back: true, x: "Abholung mit dem privaten Bus ins Hotel" },
            { t: "19:00", eve: true, x: "Treffen an der Bar – Siegerehrung – Abendessen" },
            { x: "Ausklang an der Bar" }
          ],
          abschlag: {
            label: "Flight",
            zeiten: ["10:30", "10:38", "10:46", "10:54", "11:02"],
            teams: [
              ["Mike + Dani", "Heike + Stefan"],
              ["Anja + Petra", "Michael B. + Friederike"],
              ["Sabine + Marion", "Uli + Martin"],
              ["Gerd + Volker", "Gudrun + Jascha"],
              ["Mary + Thomas", "Michael W. + Dirk"]
            ],
            duell: ["rot", "rot", "schwarz", "schwarz", "schwarz"]
          },
          praesident: {
            "Dirk": 1, "Michael W.": 1, "Michael B.": 7, "Friederike": 7, "Heike": 5,
            "Stefan": 5, "Martin": 0, "Gudrun": 7, "Jascha": 7, "Uli": 0,
            "Volker": 6, "Marion": 6, "Gerd": 6, "Mary": 7, "Thomas": 7,
            "Anja": 8, "Sabine": 6, "Mike": 5, "Dani": 5, "Petra": 8
          }
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
            { t: "18:30", eve: true, bis: "23:59", key: true, x: "Treffen an der Bar – Siegerehrung: Welches Team hat gewonnen? Wer wird Golf-Präsidentin oder Golf-Präsident?" },
            { t: "19:00", x: "Gala-Abend" },
            { x: "Große Party an der Bar – wir feiern die Siegergruppe. Offenes Ende." }
          ],
          // Einzel: zwei Spiele pro Flight, deshalb jede Abschlagzeit zweimal.
          // Ein Ergebnis später als duell mit 10 Einträgen (eins pro Spiel).
          abschlag: {
            label: "Einzel",
            zeiten: ["10:30", "10:30", "10:38", "10:38", "10:46", "10:46", "10:54", "10:54", "11:02", "11:02"],
            teams: [
              ["Gerd", "Friederike"],
              ["Volker", "Michael B."],
              ["Mary", "Gudrun"],
              ["Anja", "Stefan"],
              ["Thomas", "Dirk"],
              ["Petra", "Heike"],
              ["Sabine", "Jascha"],
              ["Mike", "Lara"],
              ["Marion", "Michael W."],
              ["Dani", "Martin"]
            ]
          }
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
