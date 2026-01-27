export class CampusCatalog {
    campuses: Campus[];

    constructor(campuses: Campus[]) {
        this.campuses = campuses;
    }

    addCampus(campus: Campus) {
        this.campuses.push(campus);
    }

    addCampusByData(name: string, latitude: number, longitude: number, address: string, codename: string) {
        const newCampus = new Campus(name, latitude, longitude, address, codename);
        this.campuses.push(newCampus);
    }
}

export class Campus {
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    codename: string;

    constructor(name: string, latitude: number, longitude: number, address: string, codename: string) {
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.address = address;
        this.codename = codename;
    }
}