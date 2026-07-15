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
    report: JSON,
    selectedDoctor: doctorAgent,
    createdOn: string
}

type Message = {
    role: string,
    text: string
}

function MedicalVoiceAgent() {
    const { sessionId } = useParams();
    const [sessionDetail, setSessionDetail] = useState<SessionDetail>()
    const [callStarted, setCallStarted] = useState(false);
    const [currentRole, setCurrentRole] = useState<string | null>(null)
    const [liveTranscript, setLiveTranscript] = useState<string>()
    const [messages, setMessages] = useState<Message[]>([])
    const [loading, setLoading] = useState(false);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const router = useRouter()

    const messagesRef = useRef<Message[]>([]);
    const liveTranscriptRef = useRef<string>("");
    const currentRoleRef = useRef<string | null>(null);
    const sessionDetailRef = useRef<SessionDetail | undefined>(undefined);
    const vapiRef = useRef<any>(null);
    const finishPromiseRef = useRef<Promise<void> | null>(null);
    const sessionFinishedRef = useRef(false);

    useEffect(() => {
        sessionDetailRef.current = sessionDetail;
    }, [sessionDetail]);

    useEffect(() => {
        if (sessionId) {
            GetSessionDetails();
        }
    }, [sessionId])

    const GetSessionDetails = async () => {
        const result = await axios.get('/api/session-chat?sessionId=' + sessionId)
        setSessionDetail(result.data)
    }

    const syncMessages = (nextMessages: Message[]) => {
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
    };

    const appendMessage = (message: Message) => {
        syncMessages([...messagesRef.current, message]);
    };

    const mapVapiMessages = (rawMessages: any[]): Message[] => {
        return rawMessages
            .map((item) => {
                const role = item.role === "assistant" || item.role === "bot" ? "assistant" : "user";
                const text =
                    typeof item.message === "string"
                        ? item.message
                        : typeof item.content === "string"
                            ? item.content
                            : typeof item.text === "string"
                                ? item.text
                                : "";

                return { role, text: text.trim() };
            })
            .filter((item) => item.text.length > 0);
    };

    const handleVapiMessage = (message: any) => {
        if (message.type === "conversation-update" && Array.isArray(message.messages)) {
            const mapped = mapVapiMessages(message.messages);
            if (mapped.length > 0) {
                syncMessages(mapped);
            }
            return;
        }

        if (message.type === "transcript" || String(message.type).startsWith("transcript")) {
            const { role, transcriptType, transcript } = message;
            if (!transcript) return;

            if (transcriptType === "partial") {
                liveTranscriptRef.current = transcript;
                currentRoleRef.current = role;
                setLiveTranscript(transcript);
                setCurrentRole(role);
                return;
            }

            const speaker = role === "assistant" ? "assistant" : "user";
            appendMessage({ role: speaker, text: transcript });
            liveTranscriptRef.current = "";
            currentRoleRef.current = null;
            setLiveTranscript("");
            setCurrentRole(null);
        }
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

        if (messagesRef.current.length > 0) {
            return messagesRef.current;
        }

        const notes = sessionDetailRef.current?.notes?.trim();
        if (notes) {
            return [{ role: "user", text: notes }];
        }

        return [];
    };

    const cleanupVapi = (vapi?: any) => {
        const instance = vapi ?? vapiRef.current;
        if (!instance) return;

        instance.off('call-start');
        instance.off('call-end');
        instance.off('message');
        instance.off('speech-start');
        instance.off('speech-end');
        instance.off('error');
    };

    const disconnectCall = async () => {
        const vapi = vapiRef.current;
        if (!vapi) {
            setCallStarted(false);
            return;
        }

        cleanupVapi(vapi);
        vapiRef.current = null;
        setCallStarted(false);

        try {
            await Promise.race([
                Promise.resolve(vapi.stop()),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Vapi stop timeout")), 3000)
                ),
            ]);
        } catch (error) {
            console.warn("Vapi stop failed or timed out:", error);
        }
    };

    const redirectToDashboard = () => {
        router.replace('/dashboard');
        setTimeout(() => {
            if (window.location.pathname.includes('/medical-agent/')) {
                window.location.href = '/dashboard';
            }
        }, 1000);
    };

    const GenerateReport = async (conversationMessages: Message[]) => {
        const result = await axios.post('/api/medical-report', {
            messages: conversationMessages,
            sessionDetail: sessionDetailRef.current,
            sessionId: sessionId
        }, {
            timeout: 90000,
        });
        return result.data;
    };

    const finishSession = async (redirectAfter = true) => {
        if (sessionFinishedRef.current) {
            if (redirectAfter) redirectToDashboard();
            return;
        }

        if (finishPromiseRef.current) {
            await finishPromiseRef.current;
            return;
        }

        finishPromiseRef.current = (async () => {
            sessionFinishedRef.current = true;
            setLoading(true);
            setGeneratingReport(true);
            setCallStarted(false);
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
                toast.error('Failed to generate report. Your session was saved without a full report.');
            } finally {
                setLoading(false);
                setGeneratingReport(false);
                if (redirectAfter) {
                    redirectToDashboard();
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
        if (!sessionDetail || callStarted || loading || generatingReport) return;

        sessionFinishedRef.current = false;
        setCallEnded(false);
        syncMessages([]);

        const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!);
        vapiRef.current = vapi;
        setCallStarted(true);

        vapi.on("call-start", () => {
            setCallStarted(true);
        });

        vapi.on("call-end", () => {
            cleanupVapi(vapi);
            vapiRef.current = null;
            setCallStarted(false);
            void finishSession();
        });

        vapi.on("error", (err: any) => {
            console.error("Vapi error:", err);
            toast.error("Call connection error");
            cleanupVapi(vapi);
            vapiRef.current = null;
            setCallStarted(false);
        });

        vapi.on("message", handleVapiMessage);

        try {
            await vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!);
        } catch (error) {
            console.error(error);
            toast.error("Failed to start call");
            cleanupVapi(vapi);
            vapiRef.current = null;
            setCallStarted(false);
        }
    };

    const endCall = async () => {
        if (loading || generatingReport) return;

        if (finishPromiseRef.current) {
            await finishPromiseRef.current;
            return;
        }

        await disconnectCall();
        await finishSession();
    };

    const goBackToDashboard = async () => {
        if (loading || generatingReport) return;

        if (callStarted || vapiRef.current) {
            await endCall();
            return;
        }

        if ((messagesRef.current.length > 0 || liveTranscriptRef.current.trim()) && !sessionFinishedRef.current) {
            await finishSession();
            return;
        }

        redirectToDashboard();
    };

    const hasConversation = messages.length > 0 || (liveTranscript?.trim().length ?? 0) > 0;

    return (
        <div>
            <Button
                variant="outline"
                className="mb-4"
                onClick={() => void goBackToDashboard()}
                disabled={loading || generatingReport}
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Button>

            <div className='p-5 border rounded-3xl bg-secondary'>
                <div className='flex justify-between items-center'>
                    <h2 className='p-1 px-2 border rounded-md flex gap-2 items-center'>
                        <Circle className={`h-4 w-4 rounded-full ${callStarted ? 'bg-green-500' : 'bg-red-500'}`} />
                        {callStarted ? 'Connected...' : generatingReport ? 'Generating report...' : 'Not Connected'}
                    </h2>
                    <h2 className='font-bold text-xl text-gray-400'>00:00</h2>
                </div>

                {sessionDetail && (
                    <div className='flex items-center flex-col mt-10'>
                        <Image
                            src={sessionDetail?.selectedDoctor?.image || "/doctor.png"}
                            alt={sessionDetail?.selectedDoctor?.specialist ?? 'doctor'}
                            width={120}
                            height={120}
                            className='h-[100px] w-[100px] object-cover rounded-full'
                        />
                        <h2 className='mt-2 text-lg'>{sessionDetail?.selectedDoctor?.specialist}</h2>
                        <p className='text-sm text-gray-400'>AI Medical Voice Agent</p>

                        <div className='mt-12 overflow-y-auto flex flex-col items-center px-10 md:px-28 lg:px-52 xl:px-72'>
                            {messages.slice(-4).map((msg, index) => (
                                <h2 className='text-gray-400 p-2' key={index}>{msg.role}: {msg.text}</h2>
                            ))}
                            {liveTranscript && liveTranscript.length > 0 && (
                                <h2 className='text-lg'>{currentRole}: {liveTranscript}</h2>
                            )}
                        </div>

                        {generatingReport ? (
                            <Button disabled className="mt-20">
                                <Loader className="animate-spin" />
                                Generating your medical report...
                            </Button>
                        ) : callEnded ? (
                            <Button onClick={redirectToDashboard} className="mt-20">
                                <ArrowLeft />
                                Return to Dashboard
                            </Button>
                        ) : callStarted ? (
                            <Button variant="destructive" onClick={() => void endCall()} className="mt-20">
                                <PhoneCall /> Disconnect
                            </Button>
                        ) : hasConversation ? (
                            <Button onClick={() => void endCall()} className="mt-20">
                                <ArrowLeft />
                                Finish & Generate Report
                            </Button>
                        ) : (
                            <Button onClick={() => void StartCall()} className='mt-20'>
                                <PhoneCall /> Start Call
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MedicalVoiceAgent
