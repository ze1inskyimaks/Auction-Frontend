import {getActiveAuctionsLots} from "../services/auction-api";
import {Lot} from "../model/Lot";
import {useEffect, useState} from "react";
import { useNavigate } from 'react-router-dom';


const HomePage = () => {
    const [lots, setLots] = useState<Lot[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLots = async () => {
            try {
                const data = await getActiveAuctionsLots();
                setLots(data);
            } catch (error) {
                console.error('Error fetching lots:', error);
            }
        };

        fetchLots();
    }, []);

  return <div>
      <h1>Home page</h1>
      <ul>
          {lots.map(lot =>
              <li key={lot.id}>Id: {lot.id}, Name: {lot.name},StartedPrice {lot.startPrice}
                  <button onClick={() => navigate(`/lot/${lot.id}`)}>Перейти</button>
              </li>)
          }
      </ul>
  </div>
}

export default HomePage;