"use client"

import axios from 'axios';
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
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
    const [generatingReport, setGeneratingReport] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const router = useRouter()
    const messagesRef = useRef<messages[]>([]);
    const liveTranscriptRef = useRef<string>("");
    const currentRoleRef = useRef<string | null>(null);
    const sessionDetailRef = useRef<SessionDetail | undefined>(undefined);
    const isFinishingRef = useRef(false);
    const finishPromiseRef = useRef<Promise<void> | null>(null);

    useEffect(() => {
        sessionDetailRef.current = sessionDetail;
    }, [sessionDetail]);

    useEffect(() => {
        sessionId && GetSessionDetails();
    }, [sessionId])

    const GetSessionDetails = async () => {
        const result = await axios.get('/api/session-chat?sessionId=' + sessionId)
        console.log(result.data)
        setSessionDetail(result.data)
    }

    const appendMessage = (message: messages) => {
        messagesRef.current = [...messagesRef.current, message];
        setMessages(messagesRef.current);
    };

    const finalizeConversation = () => {
        const pendingTranscript = liveTranscriptRef.current.trim();

        if (pendingTranscript) {
            const speaker = currentRoleRef.current === "assistant" ? "assistant" : "user";
            appendMessage({ role: speaker, text: pendingTranscript });
            liveTranscriptRef.current = "";
            setLiveTranscript("");
            setCurrentRole(null);
            currentRoleRef.current = null;
        }

        return messagesRef.current;
    };

    const cleanupVapi = (vapi?: any) => {
        const instance = vapi ?? vapiInstance;
        if (!instance) return;

        instance.off('call-start');
        instance.off('call-end');
        instance.off('message');
        instance.off('speech-start');
        instance.off('speech-end');
    };

    const GenerateReport = async (conversationMessages: messages[]) => {
        const result = await axios.post('/api/medical-report', {
            messages: conversationMessages,
            sessionDetail: sessionDetailRef.current,
            sessionId: sessionId
        })
        console.log(result.data)
        return result.data
    }

    const handleCallEnded = async (redirectAfter = true) => {
        if (finishPromiseRef.current) {
            return finishPromiseRef.current;
        }

        finishPromiseRef.current = (async () => {
            if (isFinishingRef.current) return;
            isFinishingRef.current = true;

            setLoading(true);
            setGeneratingReport(true);
            setCallStarted(false);
            setVapiInstance(null);
            setCallEnded(true);

            try {
                const conversationMessages = finalizeConversation();

                if (conversationMessages.length > 0) {
                    await GenerateReport(conversationMessages);
                    toast.success('Your report has been generated!');
                } else {
                    toast.info('Call ended without conversation to summarize.');
                }
            } catch (error) {
                console.error(error);
                toast.error('Failed to generate report. Please try again from history.');
            } finally {
                setLoading(false);
                setGeneratingReport(false);
                if (redirectAfter) {
                    router.replace('/dashboard');
                }
            }
        })();

        try {
            await finishPromiseRef.current;
        } finally {
            finishPromiseRef.current = null;
        }
    };

    const StartCall = async () => {
        if (!sessionDetail) return;

        isFinishingRef.current = false;
        setCallEnded(false);
        messagesRef.current = [];
        setMessages([]);

        const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);
        setVapiInstance(vapi);

        vapi.on("call-start", () => {
            console.log("Call started");
            setCallStarted(true);
        });

        vapi.on("call-end", () => {
            console.log("Call ended");
            cleanupVapi(vapi);
            handleCallEnded();
        });

        vapi.on("error", (err: any) => {
            console.log("Vapi error:", err);
        });

        vapi.on("message", (message: any) => {
            if (message.type === "transcript") {
                const { role, transcriptType, transcript } = message;

                if (transcriptType === "partial") {
                    liveTranscriptRef.current = transcript;
                    currentRoleRef.current = role;
                    setLiveTranscript(transcript);
                    setCurrentRole(role);
                }

                if (transcriptType === "final") {
                    const speaker = role === "assistant" ? "assistant" : "user";
                    appendMessage({ role: speaker, text: transcript });
                    liveTranscriptRef.current = "";
                    currentRoleRef.current = null;
                    setLiveTranscript("");
                    setCurrentRole(null);
                }
            }
        });

        vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!);
    };

    const endCall = () => {
        if (!vapiInstance || isFinishingRef.current) return;

        cleanupVapi(vapiInstance);
        vapiInstance.stop();
        handleCallEnded();
    };

    const goBackToDashboard = async () => {
        if ((callStarted || messagesRef.current.length > 0 || liveTranscriptRef.current.trim()) && !isFinishingRef.current) {
            if (callStarted && vapiInstance) {
                cleanupVapi(vapiInstance);
                vapiInstance.stop();
            }
            await handleCallEnded();
            return;
        }

        router.push('/dashboard');
    };

    return (
        <div>
            <Button
                variant="outline"
                className="mb-4"
                onClick={goBackToDashboard}
                disabled={loading}
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Button>

        <div className='p-5 border  rounded-3xl bg-secondary'>
            <div className='flex justify-between items-center'>
                <h2 className='p-1 px-2 border rounded-md flex gap-2 items-center'><Circle className={`h-4 w-4 rounded-full ${callStarted ? 'bg-green-500' : 'bg-red-500'}`} />{callStarted ? 'Connected...' : generatingReport ? 'Generating report...' : 'Not Connected'}</h2>
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
                {generatingReport ? (
                    <Button disabled className="mt-20">
                        <Loader className="animate-spin" />
                        Generating your medical report...
                    </Button>
                ) : callEnded ? (
                    <Button
                        onClick={() => router.replace('/dashboard')}
                        disabled={loading}
                        className="mt-20"
                    >
                        <ArrowLeft />
                        Return to Dashboard
                    </Button>
                ) : !callStarted ? (
                    <Button onClick={StartCall} disabled={loading} className='mt-20'>
                        {loading ? <Loader className='animate-spin' /> : <PhoneCall />} Start Call
                    </Button>
                ) : (
                    <Button variant="destructive" onClick={endCall} disabled={loading}>
                        {loading ? <Loader className='animate-spin' /> : <PhoneCall />} Disconnect
                    </Button>
                )}
            </div>}
        </div>
        </div>
    )
}

export default MedicalVoiceAgent
