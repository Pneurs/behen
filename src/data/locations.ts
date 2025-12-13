// Comprehensive Pakistan cities and areas data - shared across all components
export const PAKISTAN_LOCATIONS: Record<string, string[]> = {
  "Lahore": [
    "DHA Phase 1", "DHA Phase 2", "DHA Phase 3", "DHA Phase 4", "DHA Phase 5", 
    "DHA Phase 6", "DHA Phase 7", "DHA Phase 8", "DHA Phase 9", "DHA Phase 10",
    "Bahria Town", "Model Town", "Johar Town", "Gulberg", "Garden Town",
    "Faisal Town", "Iqbal Town", "Township", "Wapda Town", "Valencia Town",
    "Cantt", "Mall Road", "Shadman", "Ichra", "Anarkali", "Liberty",
    "Cavalry Ground", "Defence", "EME Society", "Askari", "Punjab Society",
    "PCSIR Society", "State Life Housing", "Lake City", "Paragon City"
  ],
  "Karachi": [
    "DHA Phase 1", "DHA Phase 2", "DHA Phase 3", "DHA Phase 4", "DHA Phase 5",
    "DHA Phase 6", "DHA Phase 7", "DHA Phase 8", "Clifton", "Bath Island",
    "PECHS", "Gulshan-e-Iqbal", "Gulistan-e-Johar", "North Nazimabad",
    "Nazimabad", "Federal B Area", "Saddar", "Korangi", "Landhi", "Malir",
    "Scheme 33", "Gulshan-e-Maymar", "Bahria Town", "Askari", "Navy Housing"
  ],
  "Islamabad": [
    "F-6", "F-7", "F-8", "F-10", "F-11", "G-6", "G-7", "G-8", "G-9", "G-10",
    "G-11", "G-13", "E-7", "E-11", "I-8", "I-9", "I-10", "I-14", "I-16",
    "DHA Phase 1", "DHA Phase 2", "Bahria Town Phase 1-8", "Blue Area",
    "Diplomatic Enclave", "Soan Garden", "PWD Housing", "Pakistan Town"
  ],
  "Rawalpindi": [
    "Bahria Town Phase 1-8", "DHA Phase 1", "DHA Phase 2", "Satellite Town",
    "Saddar", "Commercial Market", "Cantt", "Chaklala", "Westridge",
    "Askari", "Media Town", "PWD Housing", "Gulzar-e-Quaid", "Airport Housing"
  ],
  "Faisalabad": [
    "D Ground", "Peoples Colony", "Madina Town", "Gulberg", "Susan Road",
    "Samanabad", "Satiana Road", "Millat Town", "Eden Valley", "Canal Road"
  ],
  "Multan": [
    "Cantt", "Gulgasht Colony", "Shah Rukn-e-Alam", "Model Town", "Bosan Road",
    "Shalimar Colony", "Officers Colony", "Garden Town", "New Multan"
  ],
  "Peshawar": [
    "University Town", "Hayatabad Phase 1-7", "Saddar", "Cantt", "Gulbahar",
    "Board Bazaar", "Defence Colony", "Warsak Road", "Ring Road"
  ],
  "Quetta": [
    "Cantt", "Satellite Town", "Jinnah Town", "Zarghoon Road", "Airport Road",
    "Samungli Road", "Brewery Road", "Sariab Road"
  ],
  "Sialkot": [
    "Cantt", "Defence Road", "Paris Road", "Allama Iqbal Road", "Model Town",
    "Kashmir Road", "Hajipura", "Rangpura"
  ],
  "Gujranwala": [
    "Satellite Town", "Model Town", "Civil Lines", "Trust Colony", "DC Road",
    "GT Road", "Peoples Colony", "Green Town"
  ],
  "Hyderabad": [
    "Latifabad", "Qasimabad", "Auto Bhan Road", "Hussainabad", "Saddar"
  ],
  "Abbottabad": [
    "Jinnahabad", "Supply", "Mandian", "Cantt", "Link Road"
  ],
  "Bahawalpur": [
    "Model Town", "Satellite Town", "Civil Lines", "Chowk Bazaar"
  ],
  "Sargodha": [
    "Satellite Town", "University Road", "Cantt", "PAF Road"
  ],
  "Sukkur": [
    "Military Road", "Cantt", "Airport Road", "Shikarpur Road"
  ],
  "Larkana": [
    "Station Road", "Jinnah Bagh", "Sachal Colony"
  ],
  "Sahiwal": [
    "Model Town", "Farid Town", "High Court Road"
  ],
  "Mardan": [
    "Cantt", "Par Hoti", "Bank Road", "Shamsi Road"
  ],
  "Gujrat": [
    "Satellite Town", "Civil Lines", "GT Road", "Bhimber Road"
  ],
  "Kasur": [
    "Model Town", "Allama Iqbal Town", "Pattoki Road"
  ],
  "Rahim Yar Khan": [
    "Satellite Town", "Model Town", "Sadiq Abad"
  ],
  "Sheikhupura": [
    "Model Town", "Faisalabad Road", "Civil Lines"
  ],
  "Jhang": [
    "Satellite Town", "Civil Lines", "Faisalabad Road"
  ],
  "Dera Ghazi Khan": [
    "Block A", "Block B", "Civil Lines"
  ],
  "Nawabshah": [
    "Sakrand Road", "Station Road", "VIP Road"
  ],
  "Mirpur (AJK)": [
    "Sector F-1", "Sector F-2", "Allama Iqbal Road", "New City"
  ],
  "Muzaffarabad": [
    "Chehla Bandi", "Domail", "CMH Road"
  ]
};

export const CITIES = Object.keys(PAKISTAN_LOCATIONS).sort();

export const getAreasForCity = (city: string): string[] => {
  return PAKISTAN_LOCATIONS[city] || [];
};
