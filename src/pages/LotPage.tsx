import { useParams } from 'react-router-dom';
import { Lot } from "../model/Lot";
import { getAuctionLot } from "../services/auction-api";
import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import Cookies from "js-cookie";

const LotPage = () => {
    const { id } = useParams<{ id: string }>();
    const [lot, setLot] = useState<Lot | null>(null);
    const [bidAmount, setBidAmount] = useState<number>(0);
    const [hubConnection, setHubConnection] = useState<signalR.HubConnection | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isAuctionFinished, setIsAuctionFinished] = useState<boolean>(false);

    // 🚀 Завантаження даних лота
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

    // 🚀 Підключення до SignalR
    useEffect(() => {
        if (!id) return;

        const token = Cookies.get("boby");

        if (!token) {
            setError("Ви не авторизовані. Увійдіть, щоб робити ставки.");
            return;
        }

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`http://localhost:5041/auctionhub?lotId=${id}`, {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        // 📌 Обробник для нових ставок
        connection.on("ReceiveBid", (lotId, accountId, amount) => {
            console.log("Bid received:", lotId, accountId, amount);

            setLot((prevLot) => {
                if (!prevLot || prevLot.id !== lotId) return prevLot;

                return {
                    ...prevLot,
                    currentPrice: amount,
                    lastBidderId: accountId
                };
            });
        });

        // 📌 Обробник помилок
        connection.on("Error", (message) => {
            console.error("Error:", message);
            setError(message);
        });

        // 📌 Обробник завершення аукціону
        connection.on("ReceiveFinishLot", (lotId, accountId, amount) => {
            console.log("Аукціон завершено для лота:", lotId);
            setIsAuctionFinished(true);

            setLot((prevLot) => {
                if (!prevLot || prevLot.id !== lotId) return prevLot;

                return {
                    ...prevLot,
                    currentPrice: amount,
                    lastBidderId: accountId,
                    isFinished: true,
                };
            });
        });

        // 📌 Обробник відновлення з'єднання
        connection.onreconnecting(() => {
            console.warn("Відновлення з'єднання...");
            setIsConnected(false);
        });

        connection.onreconnected(() => {
            console.log("З'єднання відновлено");
            setIsConnected(true);
        });

        connection.onclose(() => {
            console.error("З'єднання було втрачено.");
            setIsConnected(false);
        });

        const startConnection = async () => {
            try {
                await connection.start();
                console.log("SignalR Connected.");
                setHubConnection(connection);
                setIsConnected(true);
            } catch (err) {
                console.error("Помилка підключення: ", err);
                setError("Не вдалося підключитися до аукціону. Спробуйте пізніше.");
            }
        };

        startConnection();

        return () => {
            connection.stop();
        };
    }, [id]);

    // 🚀 Обробка ставки
    const handleBid = async () => {
        if (!hubConnection || hubConnection.state !== signalR.HubConnectionState.Connected) {
            setError("З'єднання з сервером не встановлено. Спробуйте пізніше.");
            return;
        }

        if (!lot) return;

        try {
            await hubConnection.invoke("PlaceBid", lot.id, bidAmount);
            console.log("Bid placed successfully");
            setError(null); // Якщо ставка успішна, очищаємо помилку
        } catch (error) {
            console.error("Error placing bid:", error);
            setError("Помилка під час ставки. Спробуйте ще раз.");
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-2">
                Lot page about id: {lot?.id}
            </h2>
            <p>Started Time: {lot?.startTime}</p>
            <p>Current Price: {lot?.currentPrice}</p>

            {error && <p className="text-red-500">{error}</p>}

            {!isConnected && (
                <p className="text-yellow-500">Відновлення з'єднання...</p>
            )}

            {isAuctionFinished ? (
                <p className="text-green-500 font-bold">
                    Аукціон завершено! Переможець: {lot?.winnerId}, сума: {lot?.endPrice}
                </p>
            ) : (
                <>
                    <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(Number(e.target.value))}
                        placeholder="Enter your bid"
                        disabled={!hubConnection || !isConnected}
                        className="border p-2 mb-2 w-full"
                    />
                    <button
                        onClick={handleBid}
                        disabled={!hubConnection || !isConnected}
                        className="bg-blue-500 text-white p-2 rounded w-full"
                    >
                        Place Bid
                    </button>
                </>
            )}
        </div>
    );
};

export default LotPage;
