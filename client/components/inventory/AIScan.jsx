import React, { useState, useRef } from 'react';
import Button from '../ui/Button';
import Toast from '../ui/Toast';

const AIScan = ({ onBack }) => {
  const [image1, setImage1] = useState(null);
  const [image1Preview, setImage1Preview] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image2Preview, setImage2Preview] = useState(null);
  const [step, setStep] = useState('upload'); // upload | scanning | done
  const [uploadError, setUploadError] = useState(null);

  const image1Ref = useRef(null);
  const image2Ref = useRef(null);

  const handleImage1Change = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage1(file);
      setImage1Preview(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleImage2Change = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage2(file);
      setImage2Preview(URL.createObjectURL(file));
    }
  };

  const clearImage2 = () => {
    setImage2(null);
    setImage2Preview(null);
    if (image2Ref.current) image2Ref.current.value = '';
  };

  const handleScan = () => {
    if (!image1) {
      setUploadError('Please upload a food photo first.');
      return;
    }
    setStep('scanning');
    // TODO: wire up useAIScan
    setTimeout(() => setStep('done'), 2000);
  };

  const handleRetry = () => {
    setStep('upload');
  };

  if (step === 'upload') {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-water-800 text-lg font-medium">AI Food Scan</h2>
        <p className="text-water-600 text-sm">
          Take or upload a photo of your food. If there is a printed expiry label, you may
          add a second photo.
        </p>

        <div>
          <label className="text-water-700 mb-1 block text-sm font-medium">
            Food photo <span className="text-red-500">*</span>
          </label>
          <input
            ref={image1Ref}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImage1Change}
            className="block w-full text-sm text-slate-500 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-water-100 file:px-4 file:py-2 file:text-sm file:text-water-800 hover:file:bg-water-200"
          />
          {image1Preview && (
            <img
              src={image1Preview}
              alt="Food preview"
              className="mt-2 max-h-40 rounded-lg object-cover"
            />
          )}
        </div>

        <div>
          <label className="text-water-700 mb-1 block text-sm font-medium">
            Expiry label photo <span className="text-water-400 text-xs">(optional)</span>
          </label>
          <input
            ref={image2Ref}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImage2Change}
            className="block w-full text-sm text-slate-500 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-water-100 file:px-4 file:py-2 file:text-sm file:text-water-800 hover:file:bg-water-200"
          />
          {image2Preview && (
            <div className="relative mt-2 inline-block">
              <img
                src={image2Preview}
                alt="Expiry label preview"
                className="max-h-32 rounded-lg object-cover"
              />
              <button
                onClick={clearImage2}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {uploadError && <Toast level="warning" message={uploadError} />}

        <div className="flex gap-3">
          <Button title="Start Scan" action={handleScan} className="flex-1" />
          {onBack && (
            <button
              onClick={onBack}
              className="text-water-600 cursor-pointer self-center text-sm underline"
            >
              Back to manual search
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'scanning') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-water-200 border-t-water-800" />
        <p className="text-water-600 text-sm">Analyzing your food photo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-water-800 text-lg font-medium">Scan Result</h2>
      <div className="rounded-2xl border border-water-200 bg-water-50 p-4">
        <p className="text-water-500 text-sm italic">
          Result will appear here once the backend is connected.
        </p>
      </div>
      <Button title="Scan another" action={handleRetry} />
      {onBack && (
        <button
          onClick={onBack}
          className="text-water-600 cursor-pointer self-center text-sm underline"
        >
          Back to manual search
        </button>
      )}
    </div>
  );
};

export default AIScan;
