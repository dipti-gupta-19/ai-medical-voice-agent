"use client"
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from '@/components/ui/textarea'
import { ArrowRight, Loader, Loader2 } from 'lucide-react'
import axios from 'axios'
import DoctorAgentCard, { doctorAgent } from './DoctorAgentCard'
import SuggestedDoctorCard from './SuggestedDoctorCard'
import { useRouter } from 'next/navigation'

function AddNewSessionDialog() {

  const [note, setNote] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [suggestedDoctors, setSuggestedDoctors] = useState<doctorAgent[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<doctorAgent>()
  const router = useRouter()
  // const OnClickNext=async()=>{
  //   setLoading(true)
  //   const result=await axios.post('/api/suggest-doctors',{
  //     notes:note
  //   })
  //   console.log(result.data)
  //   setSuggestedDoctors(
  //   Array.isArray(result.data.suggestedDoctors)
  //     ? result.data.suggestedDoctors
  //     : []
  // )

  //   setLoading(false)
  // }
  const OnClickNext = async () => {
    try {
      setLoading(true);

      const result = await axios.post('/api/suggest-doctors', {
        notes: note
      });

      console.log(result.data);

      setSuggestedDoctors(
        Array.isArray(result.data.doctors)
          ? result.data.doctors
          : []  
      );
    } catch (error) {
      console.log(error);
      alert("Failed to get doctors");
    } finally {
      setLoading(false);
    }
  };

  // const onStartConsultation = async () => {
  //   setLoading(true);
  //   const result = await axios.post('/api/session-chat', {
  //     notes: note,
  //     selectedDoctor: selectedDoctor
  //   });
  //   console.log(result.data)
  //   if (result.data?.sessionId) {
  //     console.log(result.data.sessionId)
  //     //Route new coversations screen
  //     router.push('/dashboard/medical-agent/' + result.data.sessionId)
  //   }
  //   setLoading(false)

  // }
  const onStartConsultation = async () => {
    try {
      setLoading(true);

      const result = await axios.post('/api/session-chat', {
        notes: note,
        selectedDoctor: selectedDoctor
      });

      console.log(result.data);

      if (result.data?.sessionId) {
        router.push('/dashboard/medical-agent/' + result.data.sessionId);
      } else {
        alert("Session ID not received");
      }

    } catch (error: any) {
      console.log(error);

      if (error.response?.status === 429) {
        alert("AI rate limit exceeded. Please wait few seconds.");
      } else {
        alert("Something went wrong");
      }

    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="mt-3">+ Start a Consultation</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Basic Details</DialogTitle>
          <DialogDescription asChild>
            {suggestedDoctors.length === 0 ? <div>
              <h2>Add Symptoms or Any Other Details</h2>
              <Textarea placeholder='Add Detail here...'
                className='h-[200px] mt-1'
                onChange={(e) => setNote(e.target.value)}
              />
            </div> :
              <div>
                <h2>Select the Doctor</h2>
                <div className='grid grid-cols-3 gap-5'>
                  {/* //Suggested Doctors */}
                  {suggestedDoctors.map((doctor, index) => (
                    <SuggestedDoctorCard doctorAgent={doctor} key={index}
                      setSelectedDoctor={setSelectedDoctor}
                      //@ts-ignore
                      selectedDoctor={selectedDoctor} />
                  ))}
                </div>
              </div>}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant={'outline'}>Cancel</Button></DialogClose>
          {suggestedDoctors.length === 0 ? <Button disabled={!note || loading} onClick={() => OnClickNext()}>
            Next {loading ? <Loader2 className='animate-spin' /> : <ArrowRight />}</Button> :
            <Button disabled={loading || !selectedDoctor} onClick={() => onStartConsultation()}>Start Consultation
              {loading ? <Loader2 className='animate-spin' /> : <ArrowRight />}</Button>}


        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddNewSessionDialog