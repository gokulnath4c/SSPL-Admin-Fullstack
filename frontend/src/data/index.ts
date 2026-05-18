import { chennaiData } from './locations_chennai';
import { hyderabadData } from './locations_hyderabad';
import { otherCitiesData } from './locations_others';
import { thiruchengodeData } from './locations_thiruchengode';

// Merge all data
export const manualLocations: Record<string, string> = {
    ...chennaiData,
    ...hyderabadData,
    ...otherCitiesData,
    ...thiruchengodeData
};

export const getStateForCity = (city: string): string => {
    const c = city?.toUpperCase()?.trim();
    if (c === 'THIRUCHENGODE') return 'TAMIL NADU';
    if (c === 'CHENNAI' || c === 'TRICHY' || c === 'COIMBATORE') return 'TAMIL NADU';
    if (c === 'HYDERABAD') return 'TELANGANA';
    if (c === 'VIZAG' || c === 'VISAKHAPATNAM') return 'ANDHRA PRADESH';
    if (c === 'BANGALORE' || c === 'BENGALURU') return 'KARNATAKA';
    return '';
};
