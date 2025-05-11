import { useParams } from 'react-router-dom';
import { Lot } from "../model/Lot";
import { getAuctionLot } from "../services/auction-api";
import { useEffect, useState } from "react";

const LotPage = () => {
    const { id } = useParams<{ id: string }>();
    const [lot, setLot] = useState<Lot | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const GetLot = async () => {
            try {
                const data = await getAuctionLot(id);
                setLot(data);
            } catch (error) {
                console.error('Error fetching lot:', error);
                setError('Не вдалося завантажити дані лота.');
            }
        };

        GetLot();
    }, [id]);

    if (error) {
        return <p className="text-red-500">{error}</p>;
    }

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-2">
                Lot: {lot?.name}
            </h2>
            <p>Опис: {lot?.description}</p>
            <p>Початкова ціна: {lot?.startPrice} грн</p>
            <p>Час початку: {lot?.startTime}</p>

            {lot?.linkToImage ? (
                <img
                    src={lot.linkToImage}
                    alt="Зображення лота"
                    style={{ maxWidth: '300px', width: '100%', height: 'auto' }}
                    className="mt-4 rounded-lg shadow-md"
                />
            ) : (
                <p>Зображення відсутнє</p>
            )}
        </div>
    );
};

export default LotPage;
