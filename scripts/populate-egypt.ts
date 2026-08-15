import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE_PATH = path.resolve(__dirname, "../lib/db/src/seeds/locations-seed.json");

interface SeedDistrict {
  name: string;
  placeId: number;
  lat: string;
  lon: string;
}

interface SeedRegion {
  name: string;
  placeId: number;
  lat: string;
  lon: string;
  districts: SeedDistrict[];
}

interface SeedCountry {
  countryCode: string;
  regions: SeedRegion[];
}

const EGYPT_DISTRICTS: Record<string, string[]> = {
  "Cairo": [
    "Nasr City", "Heliopolis", "Maadi", "Zamalek", "Qasr El Nil", "Shubra", 
    "El-Sayeda Zeinab", "Helwan", "El-Marg", "Ain Shams", "El-Daher", 
    "El-Basatin", "El-Abaseya", "New Cairo", "El-Sherouk", "Badr City", 
    "El-Salam", "El-Matareya", "El-Zeitoun", "Hada'eq El-Kobba", "Waili", 
    "Bab El-Shariya", "Muski", "Abdeen", "El-Darb El-Ahmar", "El-Khalifa", 
    "El-Mokattam", "El-Sahel", "El-Zawya El-Hamra", "El-Sharabiya"
  ],
  "Alexandria": [
    "El Montaza First", "El Montaza Second", "East Alexandria", "Middle Alexandria", 
    "West Alexandria", "El Gumrok", "El Amreya First", "El Amreya Second", "Borg El Arab"
  ],
  "Aj Jiza": [
    "Giza City", "El Dokki", "El Agouza", "Imbaba", "El Haram", "El Omraniya", 
    "El Bulaq El Dakrour", "Sheikh Zayed", "6th of October", "El Badrashein", 
    "El Ayat", "Oseem", "Kerdasa", "Abu Nomros", "El Atfih", "El Saf", "El Wahat El Bahariya"
  ],
  "Luxor": [
    "Luxor City", "Esna", "Armant", "El Bayadeya", "El Ziniah", "Al Tud", "New Luxor"
  ],
  "Aswan": [
    "Aswan City", "Kom Ombo", "Edfu", "Nasr Al-Nuba", "Daraw", "Abu Simbel"
  ],
  "Al Ismailiya": [
    "Ismailia City", "El Tal El Kebir", "Fayed", "El Qantara West", 
    "El Qantara East", "Abu Suweir", "El Kassassin"
  ],
  "Suez": [
    "Suez City", "El Arbaeen", "El Ganayen", "El Attaka", "Faisal"
  ],
  "Port Said": [
    "Port Said City", "El Sharq", "El Arab", "El Manakh", "El Dawahi", 
    "El Zohour", "Port Fouad", "El Ganoub"
  ],
  "Damietta": [
    "Damietta City", "Faraskour", "El Zarqa", "Kafr El Saad", "New Damietta"
  ],
  "Al Qalyubiya": [
    "Banha", "Shubra El Kheima", "Qalyoub", "El Khanka", "Abu Zaabal", 
    "Shebin El Qanater", "El Qanater El Khayriya", "El Obour", "Tukh", "Qaha"
  ],
  "Eastern": [
    "Zagazig", "10th of October", "Belbeis", "Minya El Qamh", "Abu Hammad", 
    "Faqus", "Abu Kebir", "El Huseiniya", "Kafr Saqr", "Awlad Saqr", 
    "Diyarb Negm", "Mashtool El Souq", "El Ibrahimiya"
  ],
  "Ad Daqahliyya": [
    "Mansoura", "Mit Ghamr", "Talkha", "Dekernes", "El Senbellawein", 
    "Sherbin", "El Matareya", "Belqas", "Aga", "Minyet El Nasr"
  ],
  "Kafr El Sheikh": [
    "Kafr El Sheikh City", "Desouq", "Fouah", "Metoubas", "Baltim", 
    "El Hamoul", "Bila", "El Riyadh", "Qallin", "Sidi Salem"
  ],
  "Western": [
    "Tanta", "El Mahalla El Kubra", "Kafr El Zayat", "Zefta", "Samanoud", 
    "Qutur", "Basyoun", "El Santa"
  ],
  "El Minufiyya": [
    "Shibin El Kom", "Menouf", "Ashmoun", "Sadaat City", "Bagour", 
    "Quwaysna", "Tala", "Ash Shuhada"
  ],
  "Lake": [
    "Damanhour", "Kafr El Dawwar", "Rashid", "Abou Homs", "Itay El Baroud", 
    "El Delengat", "Koum Hamada", "Badr City", "Abu El Matamir", 
    "Shubra Khit", "Edko", "Mahmoudiyah", "Wadi El Natrun"
  ],
  "Faiyum": [
    "Fayoum City", "Sinnuris", "Ibsheway", "Itsa", "Tamiya", "Youssef El Seddik"
  ],
  "Bani Sweif": [
    "Beni Suef City", "Nasser", "El Wasty", "Biba", "Sumusta", "El Fashn", "Ihnasiya"
  ],
  "Al Minya": [
    "Minya City", "Mallawi", "Bani Mazar", "Maghagha", "Samalut", 
    "Abu Qurqas", "El Idwa", "Deir Mawas", "Matai"
  ],
  "Asyut": [
    "Asyut City", "Dairut", "El Qusiya", "Manfalut", "Aboub", "El Badari", 
    "El Ghenayem", "Sahel Selim", "Sedfa", "Abuteeg"
  ],
  "Suhaj": [
    "Sohag City", "Akhmim", "Girga", "Tahta", "Tima", "El Balyana", 
    "Dar El Salam", "Juhayna", "Monsha'ah", "Sakalta"
  ],
  "Qena": [
    "Qena City", "Naja Hammadi", "Abu Tesht", "Farshoot", "Dishna", 
    "Qus", "Naqada", "El Waqf"
  ],
  "Matruh": [
    "Marsa Matruh", "El Alamein", "Siwa Oasis", "Dabaa", "Sallum", 
    "Sidi Barrani", "Al Hamam"
  ],
  "New Valley": [
    "Kharga Oasis", "Dakhla Oasis", "Farafra Oasis", "Baris Oasis"
  ],
  "Red Sea": [
    "Hurghada", "Safaga", "Quseir", "Marsa Alam", "Ras Gharib", "Shalateen", "Halayeb"
  ],
  "North Sinai": [
    "Arish", "Sheikh Zuweid", "Rafah", "Bir al-Abed", "Nekhel", "Al-Hasana"
  ],
  "South Sinai": [
    "Sharm El Sheikh", "Dahab", "Nuweiba", "Taba", "Saint Catherine", 
    "El Tor", "Ras Sidr", "Abu Zenima", "Abu Rudeis"
  ]
};

async function main() {
  if (!fs.existsSync(SEED_FILE_PATH)) {
    console.error("Locations seed file does not exist.");
    process.exit(1);
  }

  const raw = fs.readFileSync(SEED_FILE_PATH, "utf8");
  const data = JSON.parse(raw) as SeedCountry[];

  const egyptIdx = data.findIndex(c => c.countryCode === "EG");
  if (egyptIdx === -1) {
    console.error("Egypt country code not found in seed file.");
    process.exit(1);
  }

  const egypt = data[egyptIdx];
  let generatedId = 80000000;

  for (const region of egypt.regions) {
    const customDistricts = EGYPT_DISTRICTS[region.name];
    if (customDistricts) {
      console.log(`Populating districts for region: ${region.name} (${customDistricts.length} districts)...`);
      region.districts = customDistricts.map(name => {
        generatedId++;
        return {
          name,
          placeId: generatedId,
          lat: region.lat,
          lon: region.lon
        };
      });
    } else {
      console.warn(`No static districts mapped for region: ${region.name}`);
    }
  }

  fs.writeFileSync(SEED_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  console.log("Successfully populated Egypt's high-fidelity subdivisions in locations-seed.json!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
