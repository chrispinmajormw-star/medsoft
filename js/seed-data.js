// Sample facilities used in demo mode (when Supabase is not configured).
// Same shape as rows in the public.facilities table. Generated alongside supabase/seed.sql.
export const SEED_FACILITIES = [
  {
    "id": 1,
    "name": "Kamuzu Central Pharmacy",
    "type": "pharmacy",
    "lat": -13.9558,
    "lng": 33.7812,
    "is_24h": false,
    "open_time": "07:00",
    "close_time": "20:00",
    "phone": "+265 991 234 567",
    "address": "Kamuzu Rd, Area 9",
    "rating": 4.8,
    "reviews_count": 132,
    "stock": [
      "Amoxicillin",
      "Paracetamol",
      "ORS Sachets",
      "Insulin",
      "Malaria test kits"
    ],
    "verified": true
  },
  {
    "id": 2,
    "name": "Area 18 Community Clinic",
    "type": "hospital",
    "lat": -13.9701,
    "lng": 33.7699,
    "is_24h": true,
    "open_time": null,
    "close_time": null,
    "phone": "+265 991 555 210",
    "address": "Presidential Way, Area 18",
    "rating": 4.6,
    "reviews_count": 98,
    "stock": [
      "Emergency care",
      "Maternity ward",
      "X-ray",
      "Blood tests",
      "Wound dressing"
    ],
    "verified": true
  },
  {
    "id": 3,
    "name": "City Centre Chemist",
    "type": "pharmacy",
    "lat": -13.9612,
    "lng": 33.7688,
    "is_24h": false,
    "open_time": "08:00",
    "close_time": "18:00",
    "phone": "+265 991 887 340",
    "address": "Convention Dr, City Centre",
    "rating": 4.3,
    "reviews_count": 57,
    "stock": [
      "Ibuprofen",
      "Cough syrup",
      "Antihistamines",
      "Contraceptives"
    ],
    "verified": true
  },
  {
    "id": 4,
    "name": "Lilongwe General Hospital",
    "type": "hospital",
    "lat": -13.9789,
    "lng": 33.7825,
    "is_24h": true,
    "open_time": null,
    "close_time": null,
    "phone": "+265 991 900 112",
    "address": "Mchinji Rd, Area 4",
    "rating": 4.5,
    "reviews_count": 410,
    "stock": [
      "Emergency care",
      "Surgery",
      "ICU",
      "Oxygen",
      "Blood transfusion"
    ],
    "verified": true
  },
  {
    "id": 5,
    "name": "Old Town Pharmacy",
    "type": "pharmacy",
    "lat": -13.974,
    "lng": 33.7601,
    "is_24h": false,
    "open_time": "07:30",
    "close_time": "19:00",
    "phone": "+265 991 442 908",
    "address": "Malangalanga Rd, Old Town",
    "rating": 4.4,
    "reviews_count": 76,
    "stock": [
      "Paracetamol",
      "Amoxicillin",
      "Vitamins",
      "Diabetes test strips"
    ],
    "verified": true
  },
  {
    "id": 6,
    "name": "Area 25 Health Post",
    "type": "hospital",
    "lat": -13.945,
    "lng": 33.777,
    "is_24h": false,
    "open_time": "07:00",
    "close_time": "17:00",
    "phone": "+265 991 310 664",
    "address": "Area 25 Roundabout",
    "rating": 4.2,
    "reviews_count": 41,
    "stock": [
      "General consultation",
      "Vaccination",
      "Malaria test kits",
      "ORS Sachets"
    ],
    "verified": true
  },
  {
    "id": 7,
    "name": "Capital Hill Pharmacy",
    "type": "pharmacy",
    "lat": -13.9495,
    "lng": 33.7655,
    "is_24h": false,
    "open_time": "08:00",
    "close_time": "21:00",
    "phone": "+265 991 763 205",
    "address": "Capital Hill, City Centre",
    "rating": 4.7,
    "reviews_count": 89,
    "stock": [
      "Antibiotics",
      "Painkillers",
      "Insulin",
      "Baby formula"
    ],
    "verified": true
  },
  {
    "id": 8,
    "name": "Riverside Medical Centre",
    "type": "hospital",
    "lat": -13.9903,
    "lng": 33.769,
    "is_24h": false,
    "open_time": "08:00",
    "close_time": "16:00",
    "phone": "+265 991 628 471",
    "address": "Riverside Dr, Area 3",
    "rating": 4.1,
    "reviews_count": 63,
    "stock": [
      "General consultation",
      "Dental care",
      "Eye clinic",
      "X-ray"
    ],
    "verified": true
  }
];
