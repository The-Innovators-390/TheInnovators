import { Campus } from "./Campus";

export class BuildingCatalog{
    buildings: Building[];

    constructor(buildings: Building[]){
        this.buildings = buildings;
    }

    addBuilding(building: Building){
        this.buildings.push(building);
    }

    addBuildingByData(name: string, latitude: number, longitude: number, address: string, campus: Campus, numberOfFloors?: number){
        if(numberOfFloors && campus){
        const newBuilding = new Building(name, latitude, longitude, address, campus, numberOfFloors);
        this.buildings.push(newBuilding);
        } else if(campus){
        const newBuilding = new Building(name, latitude, longitude, address, campus);
        this.buildings.push(newBuilding);
        } else {
            console.error("Campus is required to add a building.");
        }
    }
}

export class Building{
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    campus: Campus;
    numberOfFloors?: number;

    constructor(name: string, latitude: number, longitude: number, address: string, campus: Campus, numberOfFloors?: number){
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.address = address;
        this.campus = campus;
        if(numberOfFloors){
            this.numberOfFloors = numberOfFloors;
        }
    }
}