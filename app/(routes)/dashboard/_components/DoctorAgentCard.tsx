"use client"
import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { IconArrowRight } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@clerk/nextjs";
export type doctorAgent={
    id:number,
    specialist:string,
    description:string,
    image:string,
    agentPrompt:string,
    voiceId?:string,
    subscriptionRequired:boolean
}
type props={
    doctorAgent:doctorAgent
} 

function DoctorAgentCard({doctorAgent}:props){

    const { isSignedIn }=useAuth()??{}
    const paidUser=isSignedIn

    return(
        <div className="relative">
             {doctorAgent.subscriptionRequired &&<Badge className="absolute m-2 right-0">
                Premium
             </Badge>}
            <Image src={doctorAgent.image} 
            alt={doctorAgent.specialist} 
            width={200} height={300}
            className="w-full h-[230px] object-cover rounded-xl"
            />
            <h2 className="font-bold mt-1">{doctorAgent.specialist}</h2>
            <p className="line-clamp-2 text-sm text-gray-500">{doctorAgent.description}</p>
            {paidUser?<Button className="w-full mt-2">Start Consultation<IconArrowRight/></Button>
            :<Button disabled className="w-full mt-2">Start Consultation<IconArrowRight/></Button>}
        </div>
    )
}
export default DoctorAgentCard