"use client"

import axios from 'axios';
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { doctorAgent } from '../../_components/DoctorAgentCard';
import { ArrowLeft, Circle, Loader, PhoneCall } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';

export type SessionDetail = {
    id: number,
    notes: string,
    sessionId: string,
    report: JSON,// JSON
    selectedDoctor: doctorAgent,
    createdOn: string
}
type messages = {
    role: string,
    text: string

}

function MedicalVoiceAgent() {
    const { sessionId } = useParams();
    const [sessionDetail, setSessionDetail] = useState<SessionDetail>()
    const [callStarted, setCallStarted] = useState(false);
    const [vapiInstance, setVapiInstance] = useState<any>()
    const [currentRole, setCurrentRole] = useState<string | null>(null)
    const [liveTranscript, setLiveTranscript] = useState<string>()
    const [messages, setMessages] = useState<messages[]>([])
    const [loading, setLoading] = useState(false);
    const router=useRouter()

    useEffect(() => {
        sessionId && GetSessionDetails();
    }, [sessionId])

    const GetSessionDetails = async () => {
        const result = await axios.get('/api/session-chat?sessionId=' + sessionId)
        console.log(result.data)
        setSessionDetail(result.data)
    }

    const StartCall = async () => {
        if (!sessionDetail) return;

        const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);
        setVapiInstance(vapi);

        vapi.on("call-start", () => {
            console.log("Call started");
            setCallStarted(true);
        });

        vapi.on("call-end", () => {
            console.log("Call ended");
            setCallStarted(false);
        });

        vapi.on("error", (err: any) => {
            console.log("Vapi error:", err);
        });

        vapi.on("message", (message: any) => {
            if (message.type === "transcript") {
                const { role, transcriptType, transcript } = message;

                if (transcriptType === "partial") {
                    setLiveTranscript(transcript);
                    setCurrentRole(role);
                }

                if (transcriptType === "final") {
                    const speaker = role === "assistant" ? "assistant" : "user";

                    setMessages(prev => [
                        ...prev,
                        { role: speaker, text: transcript }
                    ]);

                    setLiveTranscript("");
                    setCurrentRole(null);
                }
            }
        });

        // IMPORTANT: pass assistantId directly
        vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!);
    };

    const endCall = async () => {
        if (!vapiInstance) return;

        setLoading(true);
        vapiInstance.stop();
        vapiInstance.off('call-start');
        vapiInstance.off('call-end');
        vapiInstance.off('message');
        vapiInstance.off('speech-start');
        vapiInstance.off('speech-end');

        setCallStarted(false);
        setVapiInstance(null);

        try {
            if (messages.length > 0) {
                await GenerateReport();
                toast.success('Your report has been generated!');
            } else {
                toast.info('Call ended without conversation to summarize.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate report');
        } finally {
            setLoading(false);
            router.replace('/dashboard');
        }
    };

    const GenerateReport = async () => {
        const result = await axios.post('/api/medical-report', {
            messages: messages,
            sessionDetail: sessionDetail,
            sessionId: sessionId
        })
        console.log(result.data)
        return result.data
    }



    const goBackToDashboard = async () => {
        if (callStarted && vapiInstance) {
            vapiInstance.stop();
            vapiInstance.off('call-start');
            vapiInstance.off('call-end');
            vapiInstance.off('message');
            vapiInstance.off('speech-start');
            vapiInstance.off('speech-end');
            setCallStarted(false);
            setVapiInstance(null);
        }
        router.push('/dashboard');
    };

    return (
        <div>
            <Button
                variant="ghost"
                className="mb-4 -ml-2"
                onClick={goBackToDashboard}
                disabled={loading}
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Button>

        <div className='p-5 border  rounded-3xl bg-secondary'>
            <div className='flex justify-between items-center'>
                <h2 className='p-1 px-2 border rounded-md flex gap-2 items-center'><Circle className={`h-4 w-4 rounded-full ${callStarted ? 'bg-green-500' : 'bg-red-500'}`} />{callStarted ? 'Connected...' : 'Not Connected'}</h2>
                <h2 className='font-bold text-xl text-gray-400'>00:00</h2>
            </div>
            {sessionDetail && <div className='flex items-center flex-col mt-10'>
                <Image src={sessionDetail?.selectedDoctor?.image || "/doctor.png"} alt={sessionDetail?.selectedDoctor?.specialist ?? 'doctor'}
                    width={120}
                    height={120}
                    className='h-[100px] w-[100px] object-cover rounded-full'
                />
                <h2 className='mt-2 text-lg'>{sessionDetail?.selectedDoctor?.specialist}</h2>
                <p className='text-sm text-gray-400'>AI Medical Voice Agent </p>
                <div className='mt-12 overflow-y-auto flex flex-col items-center px-10 md:px-28 lg:px-52 xl:px-72'>
                    {messages?.slice(-4).map((msg: messages, index) => (

                        <h2 className='text-gray-400 p-2' key={index}>{msg.role}:{msg.text}</h2>

                    ))}

                    {liveTranscript && liveTranscript?.length > 0 && <h2 className='text-lg'>{currentRole}:{liveTranscript}</h2>}
                </div>
                {!callStarted ? (<Button onClick={StartCall} disabled={loading} className='mt-20'>
                    {loading ? <Loader className='animate-spin' /> : <PhoneCall />} Start Call
                </Button>
                )
                    : (
                        <Button variant={'destructive'} onClick={endCall} disabled={loading}  >
                            {loading ? <Loader className='animate-spin' /> : <PhoneCall />} Disconnect
                        </Button>)
                }
            </div>}
        </div>
        </div>
    )
}

export default MedicalVoiceAgent