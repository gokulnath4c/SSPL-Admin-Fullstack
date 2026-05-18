import React from 'react';
import { Trophy, Award } from 'lucide-react';

interface CertificateTemplateProps {
    player: {
        name: string;
        mobile: string;
        status: string;
    };
}

const CertificateTemplate: React.FC<CertificateTemplateProps> = ({ player }) => {
    const isSelected = player.status === 'SELECTED';
    const certificateTitle = isSelected ? 'Certificate of Achievement' : 'Certificate of Participation';
    const message = isSelected
        ? 'For outstanding performance and selection in the cricket trials.'
        : 'For enthusiastic participation and improved performance in the cricket trials.';

    return (
        <div className="certificate-container w-full h-full p-8 bg-white border-8 border-double border-gray-800 flex flex-col items-center justify-center text-center relative print:w-[297mm] print:h-[210mm] print:border-none print:p-0 page-break-after-always">
            {/* Border Ornament */}
            <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-dashed border-gray-300 pointer-events-none"></div>

            {/* Header Icon */}
            <div className="mb-6">
                {isSelected ? (
                    <Trophy className="w-24 h-24 text-yellow-500" />
                ) : (
                    <Award className="w-24 h-24 text-blue-500" />
                )}
            </div>

            {/* Organization Name (Placeholder) */}
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">
                SSPL Cricket Selection Trials
            </h1>

            {/* Title */}
            <h2 className={`text-3xl font-serif font-bold mb-8 ${isSelected ? 'text-yellow-600' : 'text-blue-600'}`}>
                {certificateTitle}
            </h2>

            <p className="text-xl text-gray-600 mb-4">This is to certify that</p>

            {/* Player Name */}
            <div className="text-5xl font-dancing-script font-bold text-gray-800 mb-6 border-b-2 border-gray-300 pb-2 px-12 min-w-[500px]">
                {player.name}
            </div>

            <p className="text-xl text-gray-600 mb-8 max-w-2xl">
                {message}
            </p>

            {/* Date and Signature Area */}
            <div className="flex w-full justify-between items-end max-w-4xl mt-12 px-16">
                <div className="flex flex-col items-center">
                    <div className="w-48 border-b border-gray-900 mb-2"></div>
                    <span className="text-lg font-serif">Date</span>
                </div>

                {/* Seal Placeholder */}
                <div className="w-32 h-32 border-4 border-double border-gray-300 rounded-full flex items-center justify-center opacity-50">
                    <span className="text-xs text-gray-400">SEAL</span>
                </div>

                <div className="flex flex-col items-center">
                    <div className="w-48 border-b border-gray-900 mb-2"></div>
                    <span className="text-lg font-serif">Authorized Signature</span>
                </div>
            </div>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Playfair+Display:wght@400;700&display=swap');
        .font-dancing-script { font-family: 'Dancing Script', cursive; }
        .font-serif { font-family: 'Playfair Display', serif; }
        @media print {
            .page-break-after-always { page-break-after: always; }
            body { -webkit-print-color-adjust: exact; }
            .certificate-container { margin: 0; border: 8px double #1f2937 !important; } 
            /* Re-apply border in print since tailwind might strip it or container might be different */
        }
      `}</style>
        </div>
    );
};

export default CertificateTemplate;
