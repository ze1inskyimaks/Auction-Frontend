import axios from 'axios';
import {Lot} from "../model/Lot";

const API_URL = 'http://localhost:5041/api/v1/auction';

export const getAuctionLot = async (id: string): Promise<Lot> =>{
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
}

export const getActiveAuctionsLots = async (): Promise<Lot[]> =>{
    const response = await axios.get(API_URL);
    return response.data;
}