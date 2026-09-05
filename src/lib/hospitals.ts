export interface HospitalPreset {
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const CITY_HOSPITAL_PRESETS: Record<string, HospitalPreset[]> = {
  chennai: [
    {
      name: "Apollo Hospital, Greams Road",
      address: "21 Greams Lane, Thousand Lights, Off Greams Road",
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 13.0583,
      lng: 80.2526
    },
    {
      name: "Fortis Malar Hospital, Adyar",
      address: "52 1st Main Rd, Gandhi Nagar, Adyar",
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 13.0067,
      lng: 80.2575
    },
    {
      name: "Rajiv Gandhi Government General Hospital",
      address: "EVR Periyar Salai, Park Town",
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 13.0827,
      lng: 80.2785
    },
    {
      name: "MIOT International Hospital",
      address: "4/112 Mount Poonamallee Rd, Manapakkam",
      city: "Chennai",
      state: "Tamil Nadu",
      lat: 13.0249,
      lng: 80.1795
    }
  ],
  mumbai: [
    {
      name: "Lilavati Hospital & Research Centre",
      address: "A-791 Bandra Reclamation, Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      lat: 19.0515,
      lng: 72.8295
    },
    {
      name: "KEM Hospital & Blood Bank",
      address: "Acharya Donde Marg, Parel",
      city: "Mumbai",
      state: "Maharashtra",
      lat: 19.0028,
      lng: 72.8427
    },
    {
      name: "Kokilaben Dhirubhai Ambani Hospital",
      address: "Rao Saheb Achutrao Patwardhan Marg, Andheri West",
      city: "Mumbai",
      state: "Maharashtra",
      lat: 19.1314,
      lng: 72.8258
    },
    {
      name: "Tata Memorial Hospital",
      address: "Dr. E Borges Road, Parel",
      city: "Mumbai",
      state: "Maharashtra",
      lat: 19.0055,
      lng: 72.8436
    }
  ],
  delhi: [
    {
      name: "AIIMS (All India Institute of Medical Sciences)",
      address: "Sri Aurobindo Marg, Ansari Nagar",
      city: "Delhi",
      state: "Delhi",
      lat: 28.5672,
      lng: 77.2100
    },
    {
      name: "Safdarjung Hospital & Regional Blood Bank",
      address: "Ansari Nagar West, New Delhi",
      city: "Delhi",
      state: "Delhi",
      lat: 28.5701,
      lng: 77.2078
    },
    {
      name: "Max Super Speciality Hospital, Saket",
      address: "1, 2 Press Enclave Marg, Saket",
      city: "Delhi",
      state: "Delhi",
      lat: 28.5284,
      lng: 77.2115
    },
    {
      name: "Sir Ganga Ram Hospital",
      address: "Rajinder Nagar, New Delhi",
      city: "Delhi",
      state: "Delhi",
      lat: 28.6385,
      lng: 77.1895
    }
  ],
  bangalore: [
    {
      name: "Manipal Hospital, Old Airport Road",
      address: "98 HAL Old Airport Rd, Kodihalli",
      city: "Bangalore",
      state: "Karnataka",
      lat: 12.9592,
      lng: 77.6475
    },
    {
      name: "Victoria Hospital & Blood Bank",
      address: "Fort Road, near City Market, Kalasipalya",
      city: "Bangalore",
      state: "Karnataka",
      lat: 12.9629,
      lng: 77.5750
    },
    {
      name: "Fortis Hospital, Bannerghatta Road",
      address: "154/9 Bannerghatta Main Rd, Opposite IIM-B",
      city: "Bangalore",
      state: "Karnataka",
      lat: 12.8938,
      lng: 77.5979
    },
    {
      name: "Narayana Health City",
      address: "258/A Bommasandra Industrial Area, Anekal Taluk",
      city: "Bangalore",
      state: "Karnataka",
      lat: 12.8122,
      lng: 77.6937
    }
  ],
  kolkata: [
    {
      name: "SSKM Government Hospital & Blood Bank",
      address: "244 AJC Bose Rd, Bhowanipore",
      city: "Kolkata",
      state: "West Bengal",
      lat: 22.5393,
      lng: 88.3426
    },
    {
      name: "Apollo Multispeciality Hospitals",
      address: "58 Canal Circular Rd, Kadapara, Phool Bagan",
      city: "Kolkata",
      state: "West Bengal",
      lat: 22.5714,
      lng: 88.3995
    },
    {
      name: "AMRI Hospital, Dhakuria",
      address: "P-4 & 5 Gariahat Rd Block-A, Scheme-L11, Dhakuria",
      city: "Kolkata",
      state: "West Bengal",
      lat: 22.5113,
      lng: 88.3667
    }
  ],
  hyderabad: [
    {
      name: "Osmania General Hospital & Blood Bank",
      address: "Afzal Gunj, High Court Road",
      city: "Hyderabad",
      state: "Telangana",
      lat: 17.3753,
      lng: 78.4739
    },
    {
      name: "Apollo Health City, Jubilee Hills",
      address: "Road No. 72, Film Nagar, Jubilee Hills",
      city: "Hyderabad",
      state: "Telangana",
      lat: 17.4206,
      lng: 78.4116
    },
    {
      name: "Yashoda Hospital, Secunderabad",
      address: "Alexander Rd, Karkhana, Secunderabad",
      city: "Hyderabad",
      state: "Telangana",
      lat: 17.4419,
      lng: 78.4977
    }
  ],
  pune: [
    {
      name: "Ruby Hall Clinic & Blood Bank",
      address: "40 Sassoon Rd, Sangamvadi",
      city: "Pune",
      state: "Maharashtra",
      lat: 18.5308,
      lng: 73.8778
    },
    {
      name: "Sassoon General Hospital",
      address: "Near Pune Railway Station, Sassoon Rd",
      city: "Pune",
      state: "Maharashtra",
      lat: 18.5255,
      lng: 73.8744
    },
    {
      name: "Jehangir Hospital",
      address: "32 Sassoon Rd, Opposite Railway Station",
      city: "Pune",
      state: "Maharashtra",
      lat: 18.5292,
      lng: 73.8767
    }
  ],
  ahmedabad: [
    {
      name: "Civil Hospital & Blood Bank",
      address: "Asarwa, Ahmedabad",
      city: "Ahmedabad",
      state: "Gujarat",
      lat: 23.0526,
      lng: 72.6033
    },
    {
      name: "Zydus Hospital",
      address: "Zydus Hospitals Road, SG Highway, Thaltej",
      city: "Ahmedabad",
      state: "Gujarat",
      lat: 23.0642,
      lng: 72.5083
    },
    {
      name: "Apollo Hospitals International, Gandhinagar",
      address: "Plot No. 1A, Bhat GIDC Estate",
      city: "Ahmedabad",
      state: "Gujarat",
      lat: 23.1114,
      lng: 72.6288
    }
  ]
};

export interface StoredHospital extends HospitalPreset {
  id: string;
  usageCount: number;
  lastUsedAt: string;
  isUserAdded?: boolean;
}

const STORAGE_KEY_PREFIX = "emergency_recent_hospitals_";

/**
 * Retrieve stored list of frequently used and recent hospitals for a given city
 */
export function getStoredHospitalsForCity(city: string): StoredHospital[] {
  if (!city) return [];
  const cityKey = city.toLowerCase().trim();
  const storageKey = `${STORAGE_KEY_PREFIX}${cityKey}`;

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed: StoredHospital[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort(
          (a, b) =>
            (b.usageCount || 0) - (a.usageCount || 0) ||
            new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime()
        );
      }
    }
  } catch (err) {
    console.error("Error reading stored hospitals for city:", cityKey, err);
  }

  // Seed default hospitals from predefined presets for the city
  const presets = CITY_HOSPITAL_PRESETS[cityKey] || [];
  const seeded: StoredHospital[] = presets.map((p, idx) => ({
    ...p,
    id: `preset_${cityKey}_${idx}`,
    usageCount: Math.max(1, 10 - idx * 2), // initial frequency weight
    lastUsedAt: new Date(Date.now() - (idx + 1) * 3600000 * 24).toISOString(),
    isUserAdded: false
  }));

  if (seeded.length > 0) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(seeded));
    } catch {
      // ignore
    }
  }

  return seeded;
}

/**
 * Save or increment frequency of a hospital in the city's stored hospital list
 */
export function saveRecentHospital(hospital: {
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}): StoredHospital {
  const cityKey = hospital.city.toLowerCase().trim();
  const storageKey = `${STORAGE_KEY_PREFIX}${cityKey}`;
  const current = getStoredHospitalsForCity(hospital.city);

  const normName = hospital.name.toLowerCase().trim();
  const existingIdx = current.findIndex(
    (h) =>
      h.name.toLowerCase().trim() === normName ||
      (Math.abs(h.lat - hospital.lat) < 0.001 && Math.abs(h.lng - hospital.lng) < 0.001)
  );

  let updatedItem: StoredHospital;

  if (existingIdx !== -1) {
    const existing = current[existingIdx];
    updatedItem = {
      ...existing,
      name: hospital.name.trim(),
      address: hospital.address.trim(),
      state: hospital.state || existing.state,
      lat: hospital.lat,
      lng: hospital.lng,
      usageCount: (existing.usageCount || 0) + 1,
      lastUsedAt: new Date().toISOString()
    };
    current[existingIdx] = updatedItem;
  } else {
    updatedItem = {
      id: `hosp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: hospital.name.trim(),
      address: hospital.address.trim(),
      city: hospital.city.trim(),
      state: hospital.state.trim(),
      lat: hospital.lat,
      lng: hospital.lng,
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
      isUserAdded: true
    };
    current.unshift(updatedItem);
  }

  current.sort(
    (a, b) =>
      (b.usageCount || 0) - (a.usageCount || 0) ||
      new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime()
  );

  try {
    localStorage.setItem(storageKey, JSON.stringify(current));
  } catch (err) {
    console.error("Error saving recent hospital:", err);
  }

  return updatedItem;
}

/**
 * Remove a specific hospital from recent list
 */
export function removeRecentHospital(city: string, hospitalId: string): StoredHospital[] {
  const cityKey = city.toLowerCase().trim();
  const storageKey = `${STORAGE_KEY_PREFIX}${cityKey}`;
  const current = getStoredHospitalsForCity(city);
  const filtered = current.filter((h) => h.id !== hospitalId);
  try {
    localStorage.setItem(storageKey, JSON.stringify(filtered));
  } catch (err) {
    console.error("Error removing recent hospital:", err);
  }
  return filtered;
}

/**
 * Reset stored hospitals for a city back to default presets
 */
export function clearRecentHospitalsForCity(city: string): void {
  const cityKey = city.toLowerCase().trim();
  const storageKey = `${STORAGE_KEY_PREFIX}${cityKey}`;
  try {
    localStorage.removeItem(storageKey);
  } catch (err) {
    console.error("Error clearing stored hospitals:", err);
  }
}
