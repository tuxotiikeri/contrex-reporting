# Contrex Reporting – käyttöohje

Contrex Reporting on CON-TREX-laitteella tehtyjen isokineettisten polvivoimamittausten analysointi- ja raportointisovellus. Sovelluksessa voit tarkastella CTM- ja CXP-tiedostoja, valita mukaan toistot, vertailla jalkoja ja tallentaa tulokset PDF-raportiksi. Käyttöliittymän ja raportin kieleksi voi valita suomen tai englannin.

## 1. Sovelluksen avaaminen

### Verkkoversio

Avaa [Contrex Reporting](https://tuxotiikeri.github.io/contrex-reporting/) selaimessa. Verkkoversion käyttö ei edellytä Node.js:n asentamista tai terminaalin avaamista.

Kansion valinta käyttää selaimen paikallisten tiedostojen käyttöoikeutta. Käytä selainta, jossa kansionvalinta toimii, esimerkiksi työpöytäversiota Chromesta tai Edgestä. Salli pyydettäessä pääsy valitsemaasi mittauskansioon.

GitHub Pagesissa julkaistu sovellus avaa mittaustiedostot paikallisesti selaimessa. Sovelluksen nykyinen tiedostojen luku ja analyysi eivät lähetä mittausaineistoa GitHubiin. Julkinen verkkosivusto ja käyttäjän omalla koneella olevat mittaustiedostot ovat eri asioita.

Jos julkaistu versio ei näytä uusimpia muutoksia, päivitä sivu Windowsissa **Ctrl + F5**. Uusi versio tulee verkkoon, kun GitHubin julkaisuautomaatio valmistuu.

### Paikallinen käyttö

Paikalliseen käyttöön tarvitset projektin työkopion sekä Node.js:n ja npm:n. Projektin julkaisuautomaatio käyttää Node.js 22:ta.

Avaa terminaali projektikansiossa ja asenna riippuvuudet ensimmäisellä käyttökerralla:

```bash
npm install
```

Käynnistä sovellus:

```bash
npm run dev
```

Sovellus avautuu selaimeen. Osoite on tavallisesti `http://localhost:5175/contrex-reporting/`. Käytä terminaalissa näkyvää osoitetta, jos portti poikkeaa tästä. Pidä terminaali auki käytön aikana; palvelimen voi pysäyttää painamalla **Ctrl + C**.

Kehittäjä voi ajaa automaattiset testit komennolla `npm test`, tehdä tuotantokäännöksen komennolla `npm run build` ja tarkastella sitä komennolla `npm run preview`.

## 2. Kieli ja mittauskansion lataaminen

1. Avaa **Tiedostot / Files**.
2. Valitse **Kieli / Language** -valikosta Suomi tai English. Valinta vaikuttaa käyttöliittymään, kuvaajiin ja myöhemmin luotavaan PDF-raporttiin.
3. Paina **Valitse kansio / Select folder** ja valitse mittauskansio.
4. Hyväksy selaimen käyttöoikeuspyyntö. Sovellus etsii kansiosta tuetut CTM- ja CXP-tiedostot ja näyttää ne istunnoittain.

Sovellus muistaa aiemmin valittuja kansioita selaimen paikallisessa tallennustilassa. Selain voi pyytää käyttöoikeuden uudelleen. Verkkoversion ja paikallisen version muistamat kansiot voivat olla erilaiset, koska niillä on eri verkkosoite.

Kansion **Poista / Remove** -painike poistaa sen sovelluksen kansioluettelosta. Se ei poista alkuperäisiä mittaustiedostoja levyltä.

<img src="public/images/allow.png" alt="Selaimen käyttöoikeuspyyntö" width="300">

> **Kuvakaappauksen paikka:** tiedostoikkuna, kielivalinta, kansionvalinta ja ladattujen tiedostojen määrä. Vanhan kuvan voi korvata nykyisestä versiosta otetulla kuvalla.

## 3. Tiedostojen haku ja valinta

### Haku

Kirjoita etunimi, sukunimi tai **Subject ID** hakukenttään ja paina **Hae / Search**. ID luetaan mittaustiedoston henkilötiedoista, joten nimettömiä tutkimusmittauksia voi hakea tunnisteella.

**Piilota nimet / Hide names** lyhentää tiedostoluettelossa näkyvät nimet. ID-sarake jää näkyviin. Tämä valinta koskee tiedostoluetteloa; se ei anonymisoi PDF-raporttia.

Istuntoja voi lajitella päivämäärän ja ajan mukaan sekä rajata esimerkiksi jalan, nopeuden ja ohjelman perusteella. **Tyhjennä suodatus / Clear filters** poistaa tiedostoluettelon rajaukset. Tämä hakuun liittyvä suodatus on eri asia kuin vääntösignaalin suodatus analyysisivulla.

### Valinta

- Valitse yksittäinen tiedosto sen valintaruudusta.
- Istunnon valintaruutu valitsee istunnon tiedostot.
- Poista valinta klikkaamalla ruutua uudelleen.
- **Sulje valitut tiedostot / Close selected files** poistaa tiedostot analyysivalinnasta.

Sulje tiedostoikkuna siirtyäksesi analyysisivulle. Valitut ohjelmat näkyvät vasemmalla painikkeina, esimerkiksi con 60, con 240, ecc 30 ja con 180. Ohjelmapainike vaihtaa näkyvän analyysin; PDF-raportti kokoaa mukaan ladatut, raportin tukemat mittausohjelmat.

PDF-vertailua varten valitse saman henkilön ja mittauskerran oikea ja vasen mittaus kustakin ohjelmasta. Kuvaajissa voi vertailla useampiakin saman jalan mittauksia, mutta raportin taulukot käyttävät vain yhtä mittausta per jalka ja ohjelma. Jos niitä on valittuna useita, nykyinen raportointi käyttää käsittelyjärjestyksessä viimeistä.

> **Kuvakaappauksen paikka:** tiedostoluettelo, nimihaku, ID-haku, Piilota nimet -valinta sekä valittu oikean ja vasemman jalan mittaus.

## 4. Mitattavan tiedot ja viitearvot

Tarkista **Mitattavan tiedot / Participant details** ennen raportin luomista:

| Kenttä | Käyttötarkoitus |
|---|---|
| Sukupuoli / Sex | Rajaa näkyviä viiteaineistoja. |
| Oireileva jalka / Involved leg | Määrittää LSI:n osoittajan ja raportin jalkojen järjestyksen. |
| Paino / Body mass | Käytetään huippuväännön suhteuttamiseen: Nm / kg. |
| Lisäkommentti / Comment | Esimerkiksi ”6 kk leikkauksesta”; näkyy raportin yläosassa. |
| Viitearvot / Reference values | Valitsee tulosten vertailuaineiston. |

Tietoja luetaan mittaustiedostosta, mutta niitä voi muuttaa analyysia varten. Tarkista ne uudelleen, kun vaihdat henkilöä tai mittauskertaa.

### Viiteaineiston valinta

Viitearvoja on lisätty miesten ja naisten jalkapalloon, poikien jalkapalloon, koripalloon, käsipalloon, miesten maantiepyöräilyyn sekä miesten ja naisten alppihiihtoon. Jalkapallossa on myös miesten non-elite-ryhmä. Lentopallovaihtoehto on valmistelussa eikä sisällä viitearvoja.

Valikon aineistot rajautuvat sukupuolivalinnan mukaan: miesvalinta piilottaa naisten ja tyttöjen aineistot, naisvalinta miesten ja poikien aineistot. Valitun aineiston lähde näkyy valikon alla. Nykyiset lähteet sisältävät van Melick et al. (2022), Rannama et al. (2013) ja Alhammoud et al. (2019).

Viitearvot ovat ryhmä-, nopeus- ja muuttujakohtaisia. Esimerkiksi 300°/s-aineiston arvoja ei siirretä automaattisesti 240°/s-mittaukseen. Kaikille muuttujille tai ohjelmille ei ole arvoja; puuttuva viite näytetään viivana **–**. **Ei käytössä / None** poistaa viiteaineistoon perustuvan vertailun, mutta puoliero voidaan edelleen laskea.

Viitearvo esitetään yleensä muodossa **keskiarvo ± SD**, missä SD on viiteaineiston keskihajonta. Joillekin muuttujille on määritelty vaihteluväli; jalkapallon mixed-ration nykyinen viitealue on **100–130 %**. Tämä on mixed-ration alue, ei jalkojen välisen LSI:n hyväksymisraja.

> **Kuvakaappauksen paikka:** Mitattavan tiedot, valittu viiteaineisto ja sen lähdeteksti.

## 5. Toistot ja datankäsittely

### Toistojen valinta

Vasemman laidan tiedostoluettelosta voit valita tarkasteltavan tiedoston. Toistojen valintaruuduilla poistat tarvittaessa toiston analyysistä. Valinta koskee toiston ojennus- ja koukistusvaihetta yhdessä.

Pois valitut toistot eivät osallistu niistä laskettaviin tunnuslukuihin tai keskiarvokäyriin. Myös kokonaistyö ja työväsyminen muuttuvat, jos toistoja poistetaan.

### Toistojen rajaus

CTM-tiedoston **move 1 / move 2** -merkit tunnistavat toistojen vaiheet. Niiden sisällä etsitään jatkuva liikejakso nopeuden avulla. Liikkeen rajauksen nopeuskynnys on suurempi arvoista **5°/s** ja **20 % asetetusta mittausnopeudesta**.

Rajaus ei tarkoita, että koko mukaan otettu jakso olisi täsmälleen tavoitenopeudessa. Mukana voi olla myös kiihdytys- ja hidastusvaihetta. Suodatuksen ollessa päällä liikkeen ulkopuolinen vääntö nollataan analyysin vääntösignaalista. Suodatuksen ollessa pois päältä laskentaan käytetään merkkipohjaisia toistorajoja ja suodattamatonta vääntöä, jolloin myös käännöskohdan kuormitus voi vaikuttaa tunnuslukuihin.

### Painovoimakorjaus / Gravity correction

Painovoimakorjaus on oletusarvoisesti päällä. Se käyttää **jokaisen mittauksen omaa** gravity-taulukkoa, jalan puolta ja käyttäjäkohtaista anatomista nollakulmaa. Yhden tiedoston korjausarvoja ei siirretä muihin mittauksiin.

CTM:n taulukossa on 360 yhden asteen arvoa, jotka muunnetaan yksiköstä 0,1 Nm newtonmetreiksi. Välikulmien korjaus interpoloidaan. Kulman ja väännön merkkisuunta käsitellään oikealle ja vasemmalle jalalle erikseen.

Jos tiedoston kompensaatiotieto osoittaa painovoimakorjauksen jo tehdyksi, sovellus ei tee sitä uudelleen. Tämä estää esimerkiksi korjatun CXP-tiedoston kaksinkertaisen painovoimakorjauksen. Tarkistus perustuu tiedoston kompensaatiomerkintään, ei pelkkään tiedostopäätteeseen.

Painovoimakorjaus vaikuttaa vääntöön ja siitä laskettuihin tuloksiin, esimerkiksi työhön ja Nm / kg -arvoihin. Valinnan poistaminen käytöstä ei kumoa tiedostoon jo valmiiksi tehtyä korjausta.

### Suodatus / Filtering

Suodatus on oletusarvoisesti päällä, ja selain voi muistaa aiemmin valitun asetuksen. Nykyinen toteutus käyttää **11 Hz:n yksinapaista IIR-alipäästösuodatinta**, jonka näytteenottotaajuus on toteutuksessa 256 Hz.

Toiston vääntö suodatetaan liikejakson alusta kohti huippua ja lopusta taaksepäin kohti huippua. Näin reunat vaimenevat molemmissa päissä. Tämä ei ole sama asia kuin kuvaajan nollapisteiden lisääminen, eikä toteutusta ole varmennettu valmistajan suodattimen täsmälliseksi kopioksi.

Suodatus voi muuttaa huippuvääntöä, työtä ja 0,2 s vääntöä. CXP-tiedoston jo tehtyä suodatusta ei ohiteta automaattisesti samalla tavalla kuin painovoimakorjausta; päällä oleva suodatus voi käsitellä myös valmiiksi suodatetun exportin.

### Kitkakompensointi / Friction compensation

Sovellus ei tällä hetkellä lisää erillistä omaa kitkakompensointia. CON-TREXistä viety aineisto voi sisältää valmistajan tekemää käsittelyä.

Raportin **Measurement- ja Filtering-kuvaustekstit ovat nykyisessä versiossa kiinteitä**, eivät automaattinen käsittelyloki. Filtering-rivillä mainittu kitkakompensointi ei siis vahvista, että sovellus olisi laskenut sen. Rivi ei myöskään päivity suodatus- tai painovoimakorjausvalintojen mukana. Tarkista käytetyt valinnat analyysisivulta.

> **Kuvakaappauksen paikka:** Suodatus, Painovoimakorjaus, Hajontakuvio ja toistojen valintaruudut.

## 6. Kuvaajien lukeminen

### Kulma ja lihassuunta

Vääntökuvaajien kulma-akseli pysyy välillä **0–90°**. Käyrä sijoitetaan mitatuille kulmille, eikä lyhyempää liikerataa venytetä koko kuvaajan levyiseksi.

CON-TREXin anatominen nollakulma on käyttäjäkohtainen järjestelmän kulmaviite. Se kuvaa polven suoraksi määriteltyä asentoa; esimerkiksi järjestelmän 260° ei tarkoita kuvaajan 260° polvikulmaa. Kuvaajassa käytetään mittausdatan anatomisten kulmien itseisarvoja.

Mittauksen mov1- ja mov2-rajat määräävät näytettävän liikeradan päät. Esimerkiksi −6,5° ja −86,7° näkyvät kuvaajassa noin 6,5–86,7° välillä. Näihin päihin lisätään **vain esitystä varten** nollapisteet, ja liikeradan ulkopuolella käyrä jatkuu nollatasossa. Lisätyt nollat eivät muuta mittausdataa, työtä, huippuvääntöä tai 0,2 s vääntöä. Ne eivät tarkoita, että paikallaan olevaan kampeen kohdistuisi todellisuudessa nollavääntö.

| Mittaustapa | Etureisi / Quadriceps | Takareisi / Hamstrings |
|---|---|---|
| Konsentrinen | Ojennusvaihe | Koukistusvaihe |
| Eksentrinen | Koukistuksen jarrutus | Ojennuksen jarrutus |

Eksentrisessä mittauksessa lihasnimet määräytyvät jarruttavan lihaksen mukaan, eivät samoin kuin konsentrisessä. Sääntö on sama molemmille jaloille ja molemmilla käyttöliittymän kielillä.

### Keskiarvokäyrä ja hajontakuvio

Vääntökäyrä on mukaan valittujen toistojen keskiarvo samalla polvikulmalla. Toistot interpoloidaan yhteiselle 0,1° kulmaruudukolle. Kuvaajan keskiarvokäyrän huippu ei ole sama muuttuja kuin taulukon yksittäinen huippuvääntö.

**Hajontakuvio / Repetition variability** näyttää toistojen välisen vaihtelun. Nykyisessä vääntökuvaajassa varjostus muodostetaan pienimmän ja suurimman toistokohtaisen arvon perusteella, ja niiden etäisyys keskiarvosta kerrotaan 0,8:lla. Se ei ole ±1 SD, luottamusväli tai mittausvirheen alue.

Selitteiden viivat käyttävät samoja värejä kuin esitetyt käyrät. Oikea jalka on tavallisesti vihreä ja vasen punainen; useampi saman jalan mittaus voi käyttää eri sävyjä. Kursori näyttää käyrän kohdalla väännön newtonmetreinä.

### Musta LSI-palkki

Kuvaajan alapuolinen musta palkki merkitsee jaksoa, jossa kulmakohtainen LSI on **alle 90 % tai yli 110 %**. Täsmälleen 90 % ja 110 % eivät ylitä 10 % rajaa.

Vääntö- ja HQ-kuvaajissa palkki piirretään vain, jos yhtenäinen poikkeamajakso on vähintään **5° leveä**. Pidempi jakso saa jatkua liikerajaan asti. Alle 5° jakso voi edelleen näkyä kursorin LSI-luvussa, vaikka siitä ei piirretä palkkia. Liikeradan ulkopuolisia nollapisteitä ei käytetä puolierojen muodostamiseen.

Kursorin musta merkki kulkee nollatasossa. Vääntökuvaajassa sen tekstissä on ensin LSI prosentteina ja sitten jalkojen ero newtonmetreinä.

### Kulmakohtainen HQ-käyrä

HQ lasketaan samalla kulmalla takareiden keskiarvoväännön ja etureiden keskiarvoväännön suhteena. Asteikko on **0–2**, eli 0,5 vastaa 50 %:a.

Käyrää ei piirretä liikeradan ulkopuolelle, nollaväännön kohdalle tai arvoille yli 2. Tällainen kohta katkaisee vain kyseisen jakson; käyrä voi jatkua myöhemmin. HQ-kuvaajan musta palkki vertaa jalkojen HQ-arvoja samalla 10 % / vähintään 5° säännöllä. Se ei tarkoita, että HQ-arvo olisi 10 prosenttiyksikköä viitearvoa pienempi.

Kulmakohtainen HQ-käyrä on analyysisivulla. Sitä ei tällä hetkellä sisällytetä PDF:n tarkempien sivujen kuvaajiin.

### Kestovoiman työkuvaajat

Kestovoimassa raportti näyttää jokaisen mukaan otetun toiston työn erikseen etureidelle ja takareidelle. Kuvaajilla on sama J-asteikko. Musta merkki osoittaa toiston, jonka jalkojen välinen työero ylittää 10 %. Viiden asteen leveysehto ei koske toistonumeroon perustuvaa työkuvaajaa.

> **Kuvakaappauksen paikka:** vääntökuvaajat ja HQ-kuvaaja, selitteet, hajontakuvio, kursorin arvot sekä mustat LSI-palkit.
>
> **Kuvakaappauksen paikka:** kestovoiman työ / toisto -kuvaajat.

## 7. Raportin muuttujat

| Muuttuja | Nykyinen laskenta |
|---|---|
| Huippuvääntö (Nm) | Suurin yksittäinen väännön huippu mukaan valituista toistoista. Raportti näyttää suuruuden ilman raakakanavan miinusmerkkiä. |
| Huippuvääntö (Nm / kg) | Sama yksittäinen huippuvääntö jaettuna mitattavan painolla. |
| Työ keskimäärin (J) | Mukaan valittujen toistojen työn keskiarvo. Työ lasketaan väännön ja kulmamuutoksen perusteella puolisuunnikassäännöllä; kulma muunnetaan radiaaneiksi. |
| Kokonaistyö (J) | Mukaan valittujen toistojen työn summa kyseiselle lihakselle. |
| Vääntö 0,2 s kohdalla (Nm) | Analyysin toistorajauksen alusta 0,2 s kohdalla luettu vääntö, keskiarvona mukaan valituista toistoista. Näyte pyöristetään lähimpään näyteindeksiin; lyhyessä jaksossa käytetään enintään jakson loppua. |
| Kulma huippuväännössä (°) | Toistokohtaisten huippuvääntökulmien keskiarvo. |
| Huippuväännön vaihtelu (%) | Toistokohtaisten huippuvääntöjen variaatiokerroin: 100 × keskihajonta / keskiarvon itseisarvo. |
| Työväsymisindeksi (J/s) | Toistokohtaisen työn ja toistojen alkuaikojen välisen lineaarisen sovituksen kulmakerroin. Raportti näyttää sen itseisarvon. |
| Kokonaistyö: ojennus + koukistus (J) | Etureiden ja takareiden kokonaistöiden summa. |
| HQ-ratio (%) | Kons60- ja kons240-raporteissa 100 × takareiden keskimääräinen toistohuippu / etureiden keskimääräinen toistohuippu. Kons180-raportissa suhde lasketaan keskimääräisistä töistä. |
| Mixed-ratio (%) | 100 × eks30-mittauksen takareiden yksittäinen huippuvääntö / saman jalan kons240-mittauksen etureiden yksittäinen huippuvääntö. Tarvitsee molemmat ohjelmat. |

Huippuvääntö ja Nm / kg perustuvat yksittäiseen parhaaseen huippuun **myös kestovoimassa**. HQ-ratio perustuu eri laskentaan, joten sitä ei voi aina laskea suoraan taulukon huippuvääntöriveistä.

0,2 s väännön alkuhetki määräytyy käytetystä toistorajauksesta, ei erikseen tunnistetusta lihasaktivaation alusta. Muuttuja ei ole RFD tai RTD, eikä sovellus laske niitä.

J/s-työväsymisindeksi ei ole ensimmäisen ja viimeisen kolmanneksen prosentuaalinen väsyminen. Koska raportti näyttää itseisarvon, siitä ei yksin näe, kasvoiko vai vähenikö työ: katso suunta työkuvaajasta. Indeksin täsmällistä vastaavuutta CON-TREXin omaan väsymismuuttujaan ei ole varmennettu.

Pääsivun HQ-yhteenveto perustuu keskimääräisiin toistohuippuihin. Kestovoiman PDF:n työhön perustuva HQ on siksi eri muuttuja.

## 8. Symmetria ja raportin värit

### LSI ja jalkojen järjestys

`LSI (%) = oireisen jalan arvo / verrokkijalan arvo × 100`

- **100 %:** arvot ovat yhtä suuret.
- **Alle 100 %:** oireisen jalan arvo on pienempi.
- **Yli 100 %:** oireisen jalan arvo on suurempi.

Jos oireinen jalka on määritelty, toinen jalka on verrokkijalka. Muussa tapauksessa sovellus käyttää verrokkina jalkaa, jonka etureiden huippuvääntö on suurempi kons60-mittauksessa, jos molemmat tulokset ovat käytettävissä. Automaattinen valinta ei mittaa jalan todellista dominanssia.

Taulukossa vasemmalla on **Non-involved / dominant leg** eli verrokkijalka, keskellä symmetriapalkki ja oikealla **Involved / non-dominant leg** eli oireinen jalka. Järjestys ei siis ole aina oikea–vasen. Musta indikaattori siirtyy suuremman arvon suuntaan.

Palkin asteikko on **75–125 %**. Sen ulkopuolinen indikaattori pysyy palkin reunassa, mutta numerosta näet varsinaisen LSI:n.

### Symmetrialuvun ja palkin värit

| Väri | LSI-alue | Tulkinta sovelluksessa |
|---|---|---|
| Vihreä | 90–110 %, rajat mukaan lukien | Enintään 10 % poikkeama 100 %:sta. |
| Oranssi | 80–alle 90 % tai yli 110–120 % | Yli 10 %, mutta enintään 20 % poikkeama. |
| Punainen | Alle 80 % tai yli 120 % | Yli 20 % poikkeama. |

Esimerkiksi 85 % on oranssi, 80 % on vielä oranssi ja 79 % on punainen. 110 % on vihreä, 115 % oranssi ja 121 % punainen. Keltaista luokkaa ei käytetä.

Nämä ovat sovelluksen raportointirajat. Symmetrialuvun väri kertoo vain jalkojen välisestä suhteesta, ei absoluuttisen voimatason sopivuudesta viiteaineistoon.

### Status-merkki: symmetria ja viitearvo yhdessä

Tavallisen tulosrivin Status huomioi **symmetrian sekä kummankin jalan viitearvopoikkeaman**. Näistä voimakkain poikkeama määrää merkin.

| Merkki | Milloin se näkyy? |
|---|---|
| Vihreä ✓ | Arvioinnissa ei ole oranssia tai punaista poikkeamaa. Viitearvottomalla rivillä arvio perustuu saatavilla olevaan symmetriaan. |
| Oranssi ✓ | LSI on oranssilla alueella tai vähintään toinen jalka on viitekeskiarvon alapuolella, mutta alle yhden SD:n verran. Punaista poikkeamaa ei ole. |
| Punainen × | LSI on punaisella alueella tai vähintään toinen jalka on vähintään yhden SD:n viitekeskiarvon alapuolella. |
| Ei merkkiä | Rivillä ei ole arviointiperustetta, tai muuttujalle ei käytetä statusarviota. |

Tavanomaisessa ”suurempi on parempi” -viitteessä nykyinen vertailu toimii näin:

- Arvo vähintään viitekeskiarvo: ei viitearvopoikkeamaa.
- Arvo keskiarvon alapuolella, mutta yli keskiarvo − SD: oranssi.
- Arvo enintään keskiarvo − SD: punainen.

Esimerkiksi viitteellä **200 ± 20 Nm** arvo 210 Nm ei tuota viitevaroitusta, 190 Nm tuottaa oranssin ja 180 Nm punaisen. Jos molemmat jalat ovat 170 Nm, LSI on 100 % ja sen luku vihreä, mutta Status on punainen.

Jos viitteeseen on määritelty ”pienempi on parempi”, vertailusuunta kääntyy: keskiarvon ylitys on oranssi ja vähintään yhden SD:n ylitys punainen. Jos viite on ala- ja ylärajan määrittämä vaihteluväli, rajat kuuluvat hyväksyttyyn alueeseen ja sen ulkopuoli tuottaa punaisen merkin. Tällaisessa vertailussa ei ole erillistä oranssia vyöhykettä.

HQ-rivillä on **kaksi jalkakohtaista merkkiä**, jotka luetaan samassa järjestyksessä kuin jalkojen sarakkeet. Ne perustuvat kummankin jalan HQ-viitteeseen. HQ-ratiolle ei lasketa taulukossa LSI:tä. Mixed-rivin nykyinen yksi statusmerkki tiivistää jalkojen viitevertailun.

**Kulma huippuväännössä** ja **Huippuväännön vaihtelu (%)** eivät saa statusmerkkiä. Huippuväännön vaihtelulle ei myöskään lasketa LSI:tä.

> **Kuvakaappauksen paikka:** raporttitaulukko, jossa näkyy vihreä, oranssi ja punainen symmetrialuku, statusmerkit sekä HQ-rivin kaksi jalkakohtaista merkkiä.

## 9. PDF-raportin luominen

Tarkista valitut tiedostot, toistot, käsittelyvalinnat, kehonpaino, oireinen jalka ja viiteaineisto. Paina **Tulosta / Print report**.

Raportin kieli määräytyy käyttöliittymän kielivalinnasta. Raportti ladataan PDF-tiedostona, jonka voit avata, tulostaa ja tallentaa haluamaasi paikkaan.

### Ensimmäinen sivu: one-pager

Yhteenveto kokoaa saatavilla olevat tuetut ohjelmat:

| Otsikko | Ohjelma |
|---|---|
| Maksimivoima / Maximal strength | Konsentrinen 60°/s |
| Nopeusvoima / High-speed strength | Konsentrinen 240°/s |
| Jarruttava voima / Eccentric strength | Eksentrinen 30°/s |
| Kestovoima / Strength endurance | Konsentrinen 180°/s |

Taulukot jakautuvat etureiteen ja takareiteen. Jarruttavan voiman loppurivillä on mixed-ratio, muissa HQ-ratio. Raporttiin tulee vain ohjelmat, joiden mittauksia on valittu mukaan.

Yläosassa näkyvät Metropolia liikelaboratorio, raportin nimi, CON-TREX MultiJoint ja yhteystiedot. Oikean laidan boksi sisältää testipäivän, nimen tai ID:n, kehonpainon sekä oireisen jalan. Jos nimi löytyy tiedostosta, raportissa käytetään nimeä; muuten ID:tä.

### Tarkemmat sivut

Jokainen mukana oleva raporttiohjelma saa oman tarkemman sivunsa. Vääntömittauksissa siinä ovat rinnakkain etureiden ja takareiden kuvaajat. Kestovoimassa kuvaajat näyttävät työn toistoittain. Alla on yhtenäinen taulukko, jossa ovat yhteenvetosivun arvot ja lisämuuttujat.

PDF:n kuvaajat käyttävät samaa kulmakohdistusta, viivaselitteitä ja LSI-palkkien sääntöä kuin vastaavat analyysisivun kuvaajat. PDF:n vääntökuvaajissa hajontakuvio sisällytetään mukaan myös silloin, kun analyysisivun Hajontakuvio-valinta on pois päältä.

### Tiedoston nimi

PDF:n etuliitteeksi tulee ensisijaisesti tiedostosta löytyvä ID. Jos sitä ei ole, käytetään etunimeä ja sukunimeä. Päiväys on muodossa yyyy-mm-dd, esimerkiksi:

`XXX016_2026-06-16.pdf`

Raportin Name/Nimi-kentässä voi siis näkyä henkilön nimi, vaikka tallennetun tiedoston nimi alkaisi ID:llä.

> **Kuvakaappauksen paikka:** koko one-pager sekä yksi tarkempi vääntösivu.
>
> **Kuvakaappauksen paikka:** kestovoiman tarkempi sivu ja ladatun PDF:n tiedostonimi.

## 10. Tavallisia kysymyksiä

**Miksi käyrä on nollassa ennen 6,5°:ta tai 87°:n jälkeen?**
Kuvaaja näyttää mittauksen asetetun liikeradan. Sen ulkopuolelle ei jatketa kuormitettua käyrää. Esityksen nollapisteet eivät ole uusia mittaustuloksia.

**Miksi taulukon huippuvääntö on keskiarvokäyrän huippua suurempi?**
Taulukossa on yksittäinen paras huippu. Käyrässä on toistojen keskiarvo samalla kulmalla.

**Miksi symmetrialuku on vihreä mutta Status punainen?**
Jalkojen arvot voivat olla keskenään samanlaiset, mutta toinen tai molemmat voivat jäädä viitekeskiarvosta vähintään yhden SD:n.

**Miksi viitearvon tilalla on viiva?**
Viiteaineistoa ei ole valittu tai valitussa aineistossa ei ole juuri tämän ohjelman ja muuttujan arvoa. Eri nopeuden viitteitä ei käytetä automaattisesti korvaavina arvoina.

**Miksi musta LSI-palkki puuttuu, vaikka kursorilla näkyy yli 10 % ero?**
Vääntö- ja HQ-kuvaajissa poikkeamajakson on oltava vähintään 5° leveä. Myös puuttuva vertailujalka tai vertailusuunta estää palkin muodostamisen.

**Miksi HQ-käyrässä on katkos?**
Suhde ylittää näyttörajan 2, vääntö on nolla tai kulma on yhteisen liikeradan ulkopuolella. Käyrä ei yhdistä katkoksen yli.

**Miksi CON-TREXin oma raportti ja tämä raportti eivät ole täysin samoja?**
Toistorajaus, suodatus, valitut toistot sekä tunnusluvun määritelmä voivat erota. Esimerkiksi yksittäinen huippu ja toistohuippujen keskiarvo ovat eri muuttujia. Vertaa samaa mittausta, käsittelytilaa ja muuttujan määritelmää.

**Mitä tehdä, jos tiedosto tai kuvaaja ei avaudu?**
Tarkista kansion käyttöoikeus, mukaan valitut tiedostot ja toistot. Tarkista tarvittaessa myös CTM:n move-merkit, nopeustiedot, anatominen nolla ja gravity-taulukko. Sulje tiedostot, lataa uudelleen ja kokeile selaimen kovaa päivitystä.
