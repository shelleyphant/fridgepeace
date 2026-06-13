import React, { useState, useRef, useEffect } from 'react';
import { useAIScan } from '../../hooks/useAIScan';
import Button from '../ui/Button';
import Toast from '../ui/Toast';

const AIScan = ({ onBack, onComplete }) => {
  const { scan, result, loading, error, reset } = useAIScan();

  const [image1, setImage1] = useState(null);
  const [image1Preview, setImage1Preview] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image2Preview, setImage2Preview] = useState(null);
  const [step, setStep] = useState('upload'); // upload | scanning | result | error
  const [uploadError, setUploadError] = useState(null);
  const [showManualExpiry, setShowManualExpiry] = useState(false);
  const [manualExpiryDate, setManualExpiryDate] = useState('');

  const image1Ref = useRef(null);
  const image2Ref = useRef(null);

  // When result arrives, show result page
  useEffect(() => {
    if (result) setStep('result');
  }, [result]);

  // When error arrives, show error page
  useEffect(() => {
    if (error) setStep('error');
  }, [error]);

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

  const handleScan = async () => {
    if (!image1) {
      setUploadError('Please upload a food photo first.');
      return;
    }
    setStep('scanning');
    await scan(image1, image2 || undefined);
  };

  const handleRetry = () => {
    reset();
    setStep('upload');
    setShowManualExpiry(false);
    setManualExpiryDate('');
  };

  // ============ UPLOAD ============
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

  // ============ SCANNING ============
  if (step === 'scanning') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-water-200 border-t-water-800" />
        <p className="text-water-600 text-sm">Analyzing your food photo...</p>
      </div>
    );
  }

  // ============ ERROR ============
  if (step === 'error') {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-water-800 text-lg font-medium">Scan Failed</h2>
        <Toast level="error" message={typeof error === 'string' ? error : 'Something went wrong. Please try again.'} />
        <Button title="Try Again" action={handleRetry} />
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
  }

  // ============ RESULT (basic info, scene UI comes in 3b-3e) ============
  if (step === 'result') {
    const isPackaged = result?.food_type === 'packaged';
    const isUnpackaged = result?.food_type === 'unpackaged';
    const isUncertain = result?.food_type === 'uncertain';
    const isComplete = !result?.is_incomplete;

    const handleReviewAndSave = () => {
      const food = {
        _source: 'packaged',
        product_name: result.product_name,
        brands: result.brand,
        categories: result.category,
      };
      const extras = { expiry_date: result.expiry_date || null };
      onComplete?.(food, extras);
    };

    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-water-800 text-lg font-medium">Scan Result</h2>

        {/* Food type badge */}
        <div className="mb-2">
          <span className="rounded-full bg-water-100 px-3 py-1 text-xs font-medium text-water-700">
            {isPackaged ? 'Packaged' : isUnpackaged ? 'Unpackaged' : 'Uncertain'}
            {isPackaged && (isComplete ? ' — Complete' : ' — Incomplete')}
          </span>
        </div>


        <div className="rounded-2xl border border-water-200 bg-water-50 p-4">
          {result?.product_name && (
            <p className="text-water-800 text-base font-medium">{result.product_name}</p>
          )}
          {result?.brand && (
            <p className="text-water-500 text-sm">{result.brand}</p>
          )}
          {result?.food_name && (
            <p className="text-water-800 text-base font-medium">{result.food_name}</p>
          )}
          {result?.expiry_date && (
            <p className="text-water-700 mt-1 text-sm">
              Expiry: <span className="font-medium">{result.expiry_date}</span>
            </p>
          )}
          {result?.user_message && (
            <p className="text-water-500 mt-2 text-sm">{result.user_message}</p>
          )}
          {result?.missing_information?.length > 0 && (
            <p className="text-amber-600 mt-1 text-xs">
              Missing: {result.missing_information.join(', ')}
            </p>
          )}
        </div>

        {/* Packaged + Complete: Review & Save */}
        {isPackaged && isComplete && (
          <>
            <Button title="Review &amp; Save" action={handleReviewAndSave} className="flex-1" />
            <Button title="Scan another" action={handleRetry} />
          </>
        )}

        {/* Packaged + Incomplete: manual expiry or retry */}
        {isPackaged && !isComplete && (
          <>
            {showManualExpiry ? (
              <div className="flex flex-col gap-3">
                <label className="text-water-700 text-sm font-medium">Enter Expiry Date</label>
                <input
                  type="date"
                  value={manualExpiryDate}
                  onChange={(e) => setManualExpiryDate(e.target.value)}
                  className="border-water-600 w-full rounded-xl border p-3 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    title="Confirm"
                    action={() => {
                      if (!manualExpiryDate) return;
                      onComplete?.(
                        {
                          _source: 'packaged',
                          product_name: result.product_name,
                          brands: result.brand,
                          categories: result.category,
                        },
                        { expiry_date: manualExpiryDate },
                      );
                    }}
                    className="flex-1"
                  />
                  <button
                    onClick={() => setShowManualExpiry(false)}
                    className="text-water-600 cursor-pointer self-center text-sm underline"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Button title="Upload another photo" action={handleRetry} />
                <Button title="Enter expiry manually" action={() => setShowManualExpiry(true)} color="blue" />
              </div>
            )}
          </>
        )}

        {/* Other scenarios: placeholder */}
        {!(isPackaged && isComplete) && !(isPackaged && !isComplete) && (
          <>
            <div className="rounded-2xl border border-dashed border-water-300 bg-water-50/50 p-3 text-center text-xs text-water-400">
              {isUnpackaged && 'Next: FoodKeeper match & storage (coming in 3d)'}
              {isUncertain && 'Next: Retry or manual search (coming in 3e)'}
            </div>
            <Button title="Scan another" action={handleRetry} />
          </>
        )}

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
  }

  return null;
};

export default AIScan;
