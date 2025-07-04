﻿import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const CreateLotPage: React.FC = () => {
    const [name, setName] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [startPrice, setStartPrice] = useState<number>(0);
    const [startTime, setStartTime] = useState<string>(new Date().toISOString().slice(0, 16));
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string>("");
    const navigate = useNavigate();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleCreateLot = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        try {
            const token = Cookies.get("boby");

            if (!token) {
                setError("Ви не авторизовані!");
                return;
            }

            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);
            formData.append("startPrice", startPrice.toString());
            formData.append("startTime", startTime);

            if (file) {
                formData.append("file", file);
            }

            const response = await axios.post("http://localhost:5041/api/v1/auction", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            console.log("Лот створений:", response.data);

            navigate(`/lot/${response.data}`);
        } catch (err: any) {
            console.error(err);
            setError("Помилка створення лота.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <form onSubmit={handleCreateLot} className="bg-white p-6 rounded-lg shadow-md w-96">
                <h2 className="text-2xl mb-4">Створення лота</h2>

                {error && <div className="text-red-500 mb-2">{error}</div>}

                <input
                    type="text"
                    placeholder="Назва лота"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 mb-3 border rounded-md"
                    required
                />

                <textarea
                    placeholder="Опис лота"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 mb-3 border rounded-md"
                    required
                />

                <input
                    type="number"
                    placeholder="Початкова ціна"
                    value={startPrice}
                    onChange={(e) => setStartPrice(parseFloat(e.target.value))}
                    className="w-full p-2 mb-3 border rounded-md"
                    required
                />

                <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 mb-3 border rounded-md"
                    required
                />

                <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full p-2 mb-3 border rounded-md"
                />

                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
                >
                    Створити лот
                </button>
            </form>
        </div>
    );
};

export default CreateLotPage;
