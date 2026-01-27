import { Building } from "./Building";

export class PointOfInterestCatalog {
    pointsOfInterest: PointOfInterest[];

    constructor(pointsOfInterest: PointOfInterest[]) {
        this.pointsOfInterest = pointsOfInterest;
    }

    addPointOfInterest(pointOfInterest: PointOfInterest) {
        this.pointsOfInterest.push(pointOfInterest);
    }
}

export interface PointOfInterest {
    latitude: number;
    longitude: number;
}

export interface Indoor extends PointOfInterest {
    latitude: number;
    longitude: number;
    building: Building;
}

export interface Outdoor extends PointOfInterest {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
}

export class Cafe implements Outdoor {
    latitude: number;
    longitude: number;
    name: string;
    address: string;

    constructor(latitude: number, longitude: number, name: string, address: string) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.name = name;
        this.address = address;
    }
}

export class Restaurant implements Outdoor {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
    cuisineType: string;

    constructor(latitude: number, longitude: number, name: string, address: string, cuisineType: string) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.name = name;
        this.address = address;
        this.cuisineType = cuisineType;
    }
}

export class Washroom implements Indoor {
    latitude: number;
    longitude: number;
    building: Building;
    isAccessible: boolean;
    isPublic: boolean;
    isMale: boolean;
    isFemale: boolean;
    isGenderNeutral: boolean;
    floorNumber: number;

    constructor(latitude: number, longitude: number, building: Building, isAccessible: boolean, isPublic: boolean, isMale: boolean, isFemale: boolean, isGenderNeutral: boolean, floorNumber: number) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.building = building;
        this.isAccessible = isAccessible;
        this.isPublic = isPublic;
        this.isMale = isMale;
        this.isFemale = isFemale;
        this.isGenderNeutral = isGenderNeutral;
        this.floorNumber = floorNumber;
    }
}

export class Room implements Indoor {
    latitude: number;
    longitude: number;
    building: Building;
    roomNumber: string;
    floorNumber: number;

    constructor(latitude: number, longitude: number, building: Building, roomNumber: string, floorNumber: number) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.building = building;
        this.roomNumber = roomNumber;
        this.floorNumber = floorNumber;
    }
}

export class WaterFountain implements Indoor {
    latitude: number;
    longitude: number;
    building: Building;
    floorNumber: number;
    hasBottleFiller: boolean;

    constructor(latitude: number, longitude: number, building: Building, floorNumber: number, hasBottleFiller: boolean) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.building = building;
        this.floorNumber = floorNumber;
        this.hasBottleFiller = hasBottleFiller;
    }
}

export class Stairs implements Indoor {
    latitude: number;
    longitude: number;
    building: Building;

    constructor(latitude: number, longitude: number, building: Building) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.building = building;
    }
}

export class Elevator implements Indoor {
    latitude: number;
    longitude: number;
    building: Building;

    constructor(latitude: number, longitude: number, building: Building) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.building = building;
    }
}
