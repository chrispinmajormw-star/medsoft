// Sample facilities used in demo mode (when Supabase is not configured).
// Same shape as the live query: facility_stock holds medicines and services.
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
    "verified": true,
    "facility_stock": [
      {
        "item": "Amoxicillin",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Paracetamol",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "ORS Sachets",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Insulin",
        "status": "low",
        "kind": "medicine"
      },
      {
        "item": "Malaria test kits",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Blood pressure check",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Blood pressure monitor",
        "status": "in_stock",
        "kind": "equipment"
      },
      {
        "item": "Glucometer",
        "status": "low",
        "kind": "equipment"
      }
    ]
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
    "verified": true,
    "facility_stock": [
      {
        "item": "Emergency care",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Maternity ward",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "X-ray",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Blood tests",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Wound dressing",
        "status": "in_stock",
        "kind": "service"
      }
    ]
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
    "verified": true,
    "facility_stock": [
      {
        "item": "Ibuprofen",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Cough syrup",
        "status": "out",
        "kind": "medicine"
      },
      {
        "item": "Antihistamines",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Contraceptives",
        "status": "in_stock",
        "kind": "medicine"
      }
    ]
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
    "verified": true,
    "facility_stock": [
      {
        "item": "Emergency care",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Surgery",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "ICU",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Oxygen",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Blood transfusion",
        "status": "in_stock",
        "kind": "service"
      }
    ]
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
    "verified": true,
    "facility_stock": [
      {
        "item": "Paracetamol",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Amoxicillin",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Vitamins",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Diabetes test strips",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Digital thermometer",
        "status": "in_stock",
        "kind": "equipment"
      }
    ]
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
    "verified": true,
    "facility_stock": [
      {
        "item": "General consultation",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Vaccination",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Malaria test kits",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "ORS Sachets",
        "status": "in_stock",
        "kind": "medicine"
      }
    ]
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
    "verified": true,
    "facility_stock": [
      {
        "item": "Antibiotics",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Painkillers",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Insulin",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Baby formula",
        "status": "in_stock",
        "kind": "medicine"
      },
      {
        "item": "Prescription dispensing",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Wheelchair",
        "status": "in_stock",
        "kind": "equipment"
      },
      {
        "item": "Pulse oximeter",
        "status": "in_stock",
        "kind": "equipment"
      }
    ]
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
    "verified": true,
    "facility_stock": [
      {
        "item": "General consultation",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Dental care",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "Eye clinic",
        "status": "in_stock",
        "kind": "service"
      },
      {
        "item": "X-ray",
        "status": "low",
        "kind": "service"
      }
    ]
  }
];
