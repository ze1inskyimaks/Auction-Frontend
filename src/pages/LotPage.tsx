import { useParams } from 'react-router-dom';
import {Lot} from "../model/Lot";
import {getAuctionLot} from "../services/auction-api";
import {useEffect, useState} from "react";

const LotPage = () => {
    const {id} = useParams<{id: string}>();
    const [lot, setLot] = useState<Lot | null>(null);

    useEffect(() => {
         const GetLot = async () =>{
             try {
                 const data = await getAuctionLot(id!);
                 setLot(data);
             }
             catch (error) {
                 console.error('Error fetching lot:', error);
             }
         }

        GetLot();
    }, [id])

    return <div>
        <p>Lot page about id: {lot?.id}, Started Time: {lot?.startTime}</p>
    </div>
}

export default LotPage;