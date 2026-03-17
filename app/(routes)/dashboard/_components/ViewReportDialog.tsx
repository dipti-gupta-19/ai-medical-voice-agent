import React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SessionDetail } from "../medical-agent/[sessionId]/page"
import moment from "moment"

type Props = {
    record: SessionDetail
}

function ViewReportDialog({ record }: Props) {

    const report: any =
        typeof record.report === "string"
            ? JSON.parse(record.report)
            : record.report

    return (
        <Dialog>

            <DialogTrigger asChild>
                <Button variant="link" size="sm">
                    View Report
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">

                <DialogHeader>
                    <DialogTitle className="text-center text-2xl">
                        AI Medical Voice Agent Report
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-6 space-y-6">

                    {/* Visit Info */}
                    <div>
                        <h2 className="font-bold text-blue-500 text-lg mb-2">
                            Visit Info
                        </h2>

                        <div className="grid grid-cols-2 text-sm">
                            <p>
                                <span className="font-semibold">
                                    Doctor Specialization:
                                </span>{" "}
                                {record.selectedDoctor?.specialist}
                            </p>

                            <p>
                                <span className="font-semibold">
                                    Consult Date:
                                </span>{" "}
                                {moment(record.createdOn).format("LL")}
                            </p>
                        </div>
                    </div>

                    {/* Symptoms */}
                    {report?.symptoms?.length > 0 && (
                        <div>
                            <h2 className="font-bold text-blue-500 text-lg mb-2">
                                Symptoms
                            </h2>

                            <ul className="list-disc ml-6 text-sm space-y-1">
                                {report.symptoms.map((item: string, i: number) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Summary */}
                    {report?.summary && (
                        <div>
                            <h2 className="font-bold text-blue-500 text-lg mb-2">
                                Summary
                            </h2>

                            <p className="text-sm text-gray-700 leading-relaxed">
                                {report.summary}
                            </p>
                        </div>
                    )}

                    {/* Medicines */}
                    {report?.medicationsMentioned?.length > 0 && (
                        <div>
                            <h2 className="font-bold text-blue-500 text-lg mb-2">
                                Suggested Medicines
                            </h2>

                            <ul className="list-disc ml-6 text-sm space-y-1">
                                {report.medicationsMentioned.map((med: string, i: number) => (
                                    <li key={i}>{med}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Recommendations */}
                    {report?.recommendations?.length > 0 && (
                        <div>
                            <h2 className="font-bold text-blue-500 text-lg mb-2">
                                Recommendations
                            </h2>

                            <ul className="list-disc ml-6 text-sm space-y-1">
                                {report.recommendations.map((rec: string, i: number) => (
                                    <li key={i}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Precautions */}
                    {report?.precautions?.length > 0 && (
                        <div>
                            <h2 className="font-bold text-blue-500 text-lg mb-2">
                                Precautions
                            </h2>

                            <ul className="list-disc ml-6 text-sm space-y-1">
                                {report.precautions.map((item: string, i: number) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {/* AI Disclaimer */}
                    <div className="border-t pt-4 mt-6">
                        <p className="text-xs text-gray-500 italic text-center">
                            This medical report was generated by an AI assistant based on the
                            conversation during your consultation. It is intended for informational
                            purposes only and should not replace professional medical advice,
                            diagnosis, or treatment. Always consult a qualified healthcare provider
                            for medical concerns.
                        </p>
                    </div>
                </div>

            </DialogContent>

        </Dialog>
    )
}

export default ViewReportDialog