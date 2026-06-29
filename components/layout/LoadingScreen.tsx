"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

export function LoadingScreen() {
    const [visible, setVisible] = useState(true);
    const [mounted, setMounted] = useState(true);

    useEffect(() => {
        const hasSeen = sessionStorage.getItem("has_seen_loading");

        if (hasSeen) {
            setMounted(false);
            setVisible(false);
            return;
        }

        const timer = setTimeout(() => {
            setVisible(false);
            sessionStorage.setItem("has_seen_loading", "true");

            const unmountTimer = setTimeout(() => {
                setMounted(false);
            }, 700);

            return () => clearTimeout(unmountTimer);


        }, 1800);

        return () => clearTimeout(timer)
    }, [])


    if (!mounted) return null;


    return (
        <div className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white transition-all duration-700 ease-in-out ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'} `}>

            <div className="relative flex flex-col items-center gap-6">
                <div className="relative w-40 h-40 animate-pulse">
                    <Image src="/Dankos.svg" alt="Dankos" fill className="object-contain" />
                </div>
            </div>

            <div className="h-[2px] w-24 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-[#007bff] rounded-full animate-[loading_1.8s_ease-in-out_forwards]" />
            </div>

        </div>
    )

}