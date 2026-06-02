import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import QuestionArea from './QuestionArea.jsx';
import PrizeLadder from './PrizeLadder.jsx';
import Lifelines from './Lifelines.jsx';
import AudienceModal from './AudienceModal.jsx';
import { useAudio } from '../context/AudioContext.jsx';
import { generateComment } from '../data/comments.js';
import BibleRefLink from './BibleRefLink.jsx';
import { PRIZE_AMOUNTS } from '../constants.js';

const HIDE_STUDY_KEY = 'biblionaire_hide_study_card';

// Derive 3 precision levels from a stored reference string.
// Stage 0 → precise (book, chapter, verse)
// Stage 1 → chapter (book + chapter only)
// Stage 2 → book only
function parseBibleRef(precise) {
  const parts = precise.split(';').map((s) => s.trim());

  // Chapter level: strip verse number and any trailing annotation
  const chapterParts = parts.map((p) =>
    p.replace(/[,:][\d\s–\-]+.*$/, '').trim()
  );

  // Book level: strip trailing chapter number (may be a range like 19–20)
  const bookParts = chapterParts.map((cp) =>
    cp.replace(/\s+\d[\d–\-–]*\s*$/, '').trim()
  );

  return { precise, chapter: chapterParts.join('; '), book: bookParts.join('; ') };
}

function BibleModal({ reference, stage, remaining, lang, onClose }) {
  const { t } = useTranslation();
  const stageKey = ['bible_stage_0', 'bible_stage_1', 'bible_stage_2'][stage] ?? 'bible_stage_2';
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card text-center" role="dialog" aria-modal="true" aria-labelledby="bible-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-full border-2 border-brand-gold bg-brand-gold/15 flex items-center justify-center"
               style={{ boxShadow: '0 0 24px rgba(212,175,55,0.4)' }}>
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#d4af37" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              <line x1="12" y1="7" x2="12" y2="13" />
              <line x1="9" y1="10" x2="15" y2="10" />
            </svg>
          </div>
          <div>
            <h2 id="bible-modal-title" className="font-display font-bold text-brand-gold text-xl tracking-wide">
              {t('game.bible_title')}
            </h2>
            <p className="text-brand-gold/60 text-xs font-display mt-0.5">{t(`game.${stageKey}`)}</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm mb-2">{t('game.bible_passage')}</p>
        <p className="text-brand-gold font-display font-bold text-lg mb-4 leading-snug">
          <BibleRefLink reference={reference} lang={lang} className="text-brand-gold" />
        </p>
        <p className="text-slate-500 text-xs mb-5">
          {remaining > 0
            ? t('game.bible_remaining', { count: remaining })
            : t('game.bible_exhausted')}
        </p>
        <button
          onClick={onClose}
          className="px-10 py-2.5 rounded-lg bg-brand-gold/20 border border-brand-gold/50 text-brand-gold font-display font-bold tracking-widest hover:bg-brand-gold/35 transition-colors text-sm"
        >
          {t('game.bible_close')}
        </button>
      </div>
    </div>
  );
}

function GraceModal({ result, onClose }) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const lifelineName = (key) => {
    if (key === 'fifty')   return t('game.lifeline_5050');
    if (key === 'audience') return t('game.lifeline_audience');
    if (key === 'phone')   return t('game.lifeline_phone');
    return key;
  };

  let message;
  if (result.effect === 'nothing') {
    message = t('game.grace_nothing');
  } else if (result.effect === 'restore') {
    message = t('game.grace_restore', { lifeline: lifelineName(result.lifeline) });
  } else if (result.effect === 'reveal') {
    message = t('game.grace_reveal');
  } else if (result.effect === 'strike') {
    message = t('game.grace_strike');
  } else {
    message = t('game.grace_free', { lifeline: lifelineName(result.lifeline) });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card text-center" role="dialog" aria-modal="true" aria-labelledby="grace-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-3 mb-5">
          <div className="w-14 h-14 rounded-full border-2 border-brand-gold bg-brand-gold/15 flex items-center justify-center"
               style={{ boxShadow: '0 0 24px rgba(212,175,55,0.5)' }}>
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor"
                 style={{ color: 'var(--color-gold-light)' }}>
              <path d="M11 2h2v7h7v2h-7v11h-2V11H4V9h7V2z" />
            </svg>
          </div>
          <h2 id="grace-modal-title" className="font-display font-bold text-brand-gold text-xl tracking-wide">
            {t('game.grace_title')}
          </h2>
        </div>
        <p className="text-slate-200 text-base leading-relaxed mb-6">{message}</p>
        <button
          onClick={onClose}
          className="px-10 py-2.5 rounded-lg bg-brand-gold/20 border border-brand-gold/50 text-brand-gold font-display font-bold tracking-widest hover:bg-brand-gold/35 transition-colors text-sm"
        >
          {t('game.grace_close')}
        </button>
      </div>
    </div>
  );
}


function getSafeAmount(questionIndex) {
  const level = questionIndex + 1;
  if (level >= 10) return PRIZE_AMOUNTS[10];
  if (level >= 5)  return PRIZE_AMOUNTS[5];
  return 0;
}

function buildAudienceVotes(correct, options, removedOptions) {
  const correctPct = 55 + Math.floor(Math.random() * 26);
  const remaining  = 100 - correctPct;
  const activeWrong = options
    .map((_, i) => i)
    .filter((i) => i !== correct && !removedOptions.includes(i));

  const votes = [0, 0, 0, 0];
  votes[correct] = correctPct;

  if (activeWrong.length === 0) {
    votes[correct] = 100;
  } else if (activeWrong.length === 1) {
    votes[activeWrong[0]] = remaining;
  } else {
    let left = remaining;
    for (let k = 0; k < activeWrong.length - 1; k++) {
      const share  = Math.floor(left / (activeWrong.length - k));
      const jitter = Math.floor(Math.random() * (share / 2));
      votes[activeWrong[k]] = share + jitter;
      left -= votes[activeWrong[k]];
    }
    votes[activeWrong[activeWrong.length - 1]] = Math.max(0, left);
  }
  return votes;
}

const GRACE_PROB = { 1: 1.00, 2: 0.85, 3: 0.65, 4: 0.40, 5: 0.10, 6: 0.03 };

export default function QuizGame({ questions, language, onGameEnd }) {
  const { t } = useTranslation();
  const {
    playPreselect, playClick, playCorrect, playWrong,
    playSafeHaven, playTierComplete, setMusicLevel, cycleAudioMode, audioMode, stopAll,
  } = useAudio();

  const [currentQ,        setCurrentQ]        = useState(0);
  const [preselectedAnswer, setPreselectedAnswer] = useState(null); // first click
  const [selectedAnswer,  setSelectedAnswer]  = useState(null);    // confirmed
  const [phase,           setPhase]           = useState('selecting');
  const [usedLifelines,   setUsedLifelines]   = useState({ fifty: false, audience: false, phone: false, grace: false, bible: 0 });
  const [removedOptions,  setRemovedOptions]  = useState([]);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [audienceVotes,   setAudienceVotes]   = useState(null);
  const [phoneHint,       setPhoneHint]       = useState(null);
  const [showPhoneModal,  setShowPhoneModal]  = useState(false);
  const [preselectedWalkAway, setPreselectedWalkAway] = useState(false);
  const [showLadder,      setShowLadder]      = useState(false);
  const [commentatorText, setCommentatorText] = useState(null);
  const [commentatorVisible, setCommentatorVisible] = useState(false);
  const [showGraceModal,  setShowGraceModal]  = useState(false);
  const [graceResult,     setGraceResult]     = useState(null);
  const [pendingFreeLifeline, setPendingFreeLifeline] = useState(null);
  const [showBibleModal,  setShowBibleModal]  = useState(false);
  const [bibleRef,        setBibleRef]        = useState(null);
  const [bibleStage,      setBibleStage]      = useState(0);
  const [showRulesModal,  setShowRulesModal]  = useState(false);
  const [tierCompleteNextQ, setTierCompleteNextQ] = useState(null);
  const [transitioning,    setTransitioning]    = useState(false);
  const [prevQuestion,     setPrevQuestion]     = useState(null);
  const [studyCardVisible, setStudyCardVisible] = useState(false);
  const [autoShowStudy,    setAutoShowStudy]    = useState(() => localStorage.getItem(HIDE_STUDY_KEY) !== '1');

  // Per-game helpful comment budget: 1–3 uses total
  const helpfulBudgetRef  = useRef(1 + Math.floor(Math.random() * 3));
  const tierAnsweredRef   = useRef(null);
  // Prevents consuming more than one helpful hint per question
  const helpfulUsedThisQRef = useRef(false);
  // Prevents generating more than one comment per question
  const commentGeneratedRef = useRef(false);
  const timerRef            = useRef(null);

  const currentQuestion = questions[currentQ];

  // Start background music for the current question level
  useEffect(() => {
    setMusicLevel(currentQ);
  }, [currentQ, setMusicLevel]);

  // Clear comment + preselection when a new question starts
  useEffect(() => {
    setPreselectedAnswer(null);
    setPreselectedWalkAway(false);
    setCommentatorText(null);
    commentGeneratedRef.current  = false;
    helpfulUsedThisQRef.current  = false;
  }, [currentQ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show commentator bubble and auto-dismiss after 4 s
  useEffect(() => {
    if (!commentatorText) { setCommentatorVisible(false); return; }
    setCommentatorVisible(true);
    const id = setTimeout(() => setCommentatorVisible(false), 4000);
    return () => clearTimeout(id);
  }, [commentatorText]);

  // Fade out music on unmount
  useEffect(() => () => stopAll(1.0), [stopAll]);

  // Clear timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  // ─── Game advancement ────────────────────────────────────────────────────

  const advanceGame = useCallback(
    (isCorrect) => {
      if (isCorrect) {
        const nextQ = currentQ + 1;
        if (nextQ >= questions.length) {
          onGameEnd({ finalAmount: PRIZE_AMOUNTS[15], wonGame: true, walkedAway: false, lastCorrectQuestion: 14 });
        } else if (nextQ === 5 || nextQ === 10 || nextQ === 14) {
          tierAnsweredRef.current = currentQuestion;
          stopAll(1.2);
          setTimeout(() => playTierComplete(), 700);
          setTierCompleteNextQ(nextQ);
        } else {
          const answered = currentQuestion;
          setTransitioning(true);
          timerRef.current = setTimeout(() => {
            if (answered?.reference) {
              setPrevQuestion(answered);
              setStudyCardVisible(localStorage.getItem(HIDE_STUDY_KEY) !== '1');
            } else {
              setPrevQuestion(null);
              setStudyCardVisible(false);
            }
            setCurrentQ(nextQ);
            setSelectedAnswer(null);
            setPreselectedAnswer(null);
            setPhase('selecting');
            setRemovedOptions([]);
            setPhoneHint(null);
            setTransitioning(false);
          }, 280);
        }
      } else {
        onGameEnd({
          finalAmount: getSafeAmount(currentQ),
          wonGame: false,
          walkedAway: false,
          lastCorrectQuestion: currentQ - 1,
          wrongAnswer: { correctText: currentQuestion.options[currentQuestion.correct], reference: currentQuestion.reference },
        });
      }
    },
    [currentQ, currentQuestion, questions.length, onGameEnd, stopAll, playTierComplete]
  );

  // ─── Two-click answer flow ────────────────────────────────────────────────

  const handlePreselect = useCallback(
    (index) => {
      if (phase !== 'selecting') return;
      if (preselectedAnswer !== null && index !== preselectedAnswer) {
        setCommentatorText(null);
        commentGeneratedRef.current = false;
      }
      setPreselectedWalkAway(false);
      setPreselectedAnswer(index);
      playPreselect();
      // Generate a comment once per question, on first preselect
      if (!commentGeneratedRef.current) {
        commentGeneratedRef.current = true;
        setCommentatorText(
          generateComment(currentQuestion, language, helpfulBudgetRef, index, helpfulUsedThisQRef)
        );
      }
    },
    [phase, preselectedAnswer, currentQuestion, language, playPreselect] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleConfirm = useCallback(
    (index) => {
      if (phase !== 'selecting') return;
      setSelectedAnswer(index);
      setPhase('revealing');
      playClick();

      const isCorrect = index === currentQuestion.correct;
      if (!isCorrect) {
        stopAll(0.25);
        playWrong();
      }

      clearTimer();
      timerRef.current = setTimeout(() => {
        setPhase(isCorrect ? 'correct' : 'wrong');

        if (isCorrect) {
          const nextQ = currentQ + 1;
          if (nextQ === 5 || nextQ === 10 || nextQ === 14) playSafeHaven();
          else                             playCorrect();
        }

        timerRef.current = setTimeout(() => advanceGame(isCorrect), 2000);
      }, 1500);
    },
    [phase, currentQ, currentQuestion, advanceGame, playClick, playCorrect, playWrong, playSafeHaven, stopAll]
  );

  // ─── Walk away ────────────────────────────────────────────────────────────

  const handleWalkAway = useCallback(() => {
    clearTimer();
    const takeAmount = Math.max(currentQ > 0 ? PRIZE_AMOUNTS[currentQ] : 0, getSafeAmount(currentQ));
    onGameEnd({ finalAmount: takeAmount, wonGame: false, walkedAway: true, lastCorrectQuestion: currentQ - 1 });
  }, [currentQ, onGameEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard controls: 1-4 / A-D to preselect, same key again or Enter to confirm
  // Placed after handlePreselect + handleConfirm to avoid temporal dead zone.
  useEffect(() => {
    const KEY_MAP = { '1': 0, 'a': 0, '2': 1, 'b': 1, '3': 2, 'c': 2, '4': 3, 'd': 3 };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        // BibleModal and GraceModal handle their own Escape via component-level useEffect
        if (showPhoneModal)         { setShowPhoneModal(false); return; }
        if (showAudienceModal)      { setShowAudienceModal(false); return; }
        if (phase === 'selecting')  {
          if (preselectedWalkAway) handleWalkAway();
          else setPreselectedWalkAway(true);
          return;
        }
        return;
      }
      if (showAudienceModal || showPhoneModal || showGraceModal || showBibleModal || tierCompleteNextQ !== null) return;
      if (phase !== 'selecting') return;

      const key = e.key.toLowerCase();

      if (key === 'x') {
        if (preselectedWalkAway) handleWalkAway();
        else setPreselectedWalkAway(true);
        return;
      }

      if (key === 'enter') {
        if (preselectedWalkAway)         { handleWalkAway(); return; }
        if (preselectedAnswer !== null)  handleConfirm(preselectedAnswer);
        return;
      }

      const index = KEY_MAP[key];
      if (index === undefined) return;
      if (removedOptions.includes(index)) return;

      setPreselectedWalkAway(false);
      if (preselectedAnswer === index) handleConfirm(index);
      else                             handlePreselect(index);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, preselectedAnswer, preselectedWalkAway, removedOptions, showAudienceModal, showPhoneModal, showGraceModal, showBibleModal, tierCompleteNextQ, handlePreselect, handleConfirm, handleWalkAway]);

  // ─── Lifelines ────────────────────────────────────────────────────────────

  const handleFiftyFifty = useCallback(() => {
    if (usedLifelines.fifty || phase !== 'selecting') return;
    setUsedLifelines((prev) => ({ ...prev, fifty: true }));

    const wrongIndices = currentQuestion.options
      .map((_, i) => i)
      .filter((i) => i !== currentQuestion.correct);
    const pool = [...wrongIndices];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const removed = pool.slice(0, 2);
    setRemovedOptions(removed);

    // Clear preselection if the preselected answer was just removed
    if (preselectedAnswer !== null && removed.includes(preselectedAnswer)) {
      setPreselectedAnswer(null);
    }
  }, [usedLifelines, phase, currentQuestion, preselectedAnswer]);

  const handleAudience = useCallback(() => {
    if (usedLifelines.audience || phase !== 'selecting') return;
    setUsedLifelines((prev) => ({ ...prev, audience: true }));
    setAudienceVotes(buildAudienceVotes(currentQuestion.correct, currentQuestion.options, removedOptions));
    setShowAudienceModal(true);
  }, [usedLifelines, phase, currentQuestion, removedOptions]);

  const handlePhone = useCallback(() => {
    if (usedLifelines.phone || phase !== 'selecting') return;
    setUsedLifelines((prev) => ({ ...prev, phone: true }));

    const correctLetter = ['A', 'B', 'C', 'D'][currentQuestion.correct];
    const correctText   = currentQuestion.options[currentQuestion.correct];
    const isConfident   = Math.random() < 0.8;

    let hintLetter = correctLetter;
    let hintText   = correctText;
    if (!isConfident && Math.random() < 0.5) {
      const wrongs = currentQuestion.options
        .map((opt, i) => ({ i, opt }))
        .filter(({ i }) => i !== currentQuestion.correct && !removedOptions.includes(i));
      if (wrongs.length > 0) {
        const picked = wrongs[Math.floor(Math.random() * wrongs.length)];
        hintLetter = ['A', 'B', 'C', 'D'][picked.i];
        hintText   = picked.opt;
      }
    }
    setPhoneHint({ letter: hintLetter, text: hintText, confident: isConfident });
    setShowPhoneModal(true);
  }, [usedLifelines, phase, currentQuestion, removedOptions]);

  // ─── Grace of God lifeline ───────────────────────────────────────────────

  const handleGrace = useCallback(() => {
    if (usedLifelines.grace || phase !== 'selecting') return;
    setUsedLifelines((prev) => ({ ...prev, grace: true }));

    const diff = currentQuestion.difficulty;
    const prob = GRACE_PROB[diff] ?? 0.5;

    if (Math.random() > prob) {
      setGraceResult({ effect: 'nothing' });
      setShowGraceModal(true);
      return;
    }

    // Build the pool of applicable effects
    const effects = [];

    const usedStandard = Object.entries(usedLifelines)
      .filter(([k, v]) => k !== 'grace' && v)
      .map(([k]) => k);
    if (usedStandard.length > 0) effects.push('restore');

    if (currentQ < questions.length - 1) effects.push('reveal');

    const wrongRemaining = currentQuestion.options
      .map((_, i) => i)
      .filter((i) => i !== currentQuestion.correct && !removedOptions.includes(i));
    if (wrongRemaining.length > 0) effects.push('strike');

    effects.push('free');

    const chosen = effects[Math.floor(Math.random() * effects.length)];

    if (chosen === 'restore') {
      const key = usedStandard[Math.floor(Math.random() * usedStandard.length)];
      setUsedLifelines((prev) => ({ ...prev, [key]: false }));
      setGraceResult({ effect: 'restore', lifeline: key });
      setShowGraceModal(true);

    } else if (chosen === 'reveal') {
      setPreselectedAnswer(currentQuestion.correct);
      setGraceResult({ effect: 'reveal' });
      setShowGraceModal(true);

    } else if (chosen === 'strike') {
      const strike = wrongRemaining[Math.floor(Math.random() * wrongRemaining.length)];
      setRemovedOptions((prev) => [...prev, strike]);
      if (preselectedAnswer === strike) setPreselectedAnswer(null);
      setGraceResult({ effect: 'strike' });
      setShowGraceModal(true);

    } else {
      // free lifeline — exclude fifty when fewer than 2 wrong options remain (#5)
      const freePicks = ['audience', 'phone'];
      if (wrongRemaining.length >= 2) freePicks.push('fifty');
      const pick = freePicks[Math.floor(Math.random() * freePicks.length)];

      if (pick === 'fifty') {
        const pool = [...wrongRemaining];
        for (let i = pool.length - 1; i > 0; i--) { // Fisher-Yates (#8)
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const toRemove = pool.slice(0, 2);
        setRemovedOptions((prev) => [...new Set([...prev, ...toRemove])]);
        if (preselectedAnswer !== null && toRemove.includes(preselectedAnswer)) {
          setPreselectedAnswer(null);
        }
        setGraceResult({ effect: 'free', lifeline: 'fifty' });
        setShowGraceModal(true);

      } else if (pick === 'audience') {
        setAudienceVotes(buildAudienceVotes(currentQuestion.correct, currentQuestion.options, removedOptions));
        setPendingFreeLifeline('audience');
        setGraceResult({ effect: 'free', lifeline: 'audience' });
        setShowGraceModal(true);

      } else {
        const correctLetter = ['A', 'B', 'C', 'D'][currentQuestion.correct];
        const correctText   = currentQuestion.options[currentQuestion.correct];
        const isConfident   = Math.random() < 0.8;
        let hintLetter = correctLetter;
        let hintText   = correctText;
        if (!isConfident && Math.random() < 0.5) {
          const wrongs = currentQuestion.options
            .map((opt, i) => ({ i, opt }))
            .filter(({ i }) => i !== currentQuestion.correct && !removedOptions.includes(i));
          if (wrongs.length > 0) {
            const w = wrongs[Math.floor(Math.random() * wrongs.length)];
            hintLetter = ['A', 'B', 'C', 'D'][w.i];
            hintText   = w.opt;
          }
        }
        setPhoneHint({ letter: hintLetter, text: hintText, confident: isConfident });
        setPendingFreeLifeline('phone');
        setGraceResult({ effect: 'free', lifeline: 'phone' });
        setShowGraceModal(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedLifelines, phase, currentQ, currentQuestion, removedOptions, preselectedAnswer, questions.length]);

  function closeGraceModal() {
    setShowGraceModal(false);
    if (pendingFreeLifeline === 'audience') {
      setShowAudienceModal(true);
    } else if (pendingFreeLifeline === 'phone') {
      setShowPhoneModal(true);
    }
    setPendingFreeLifeline(null);
  }

  function handleTierContinue() {
    const next = tierCompleteNextQ;
    const answered = tierAnsweredRef.current;
    tierAnsweredRef.current = null;
    setTierCompleteNextQ(null);
    if (answered?.reference) {
      setPrevQuestion(answered);
      setStudyCardVisible(localStorage.getItem(HIDE_STUDY_KEY) !== '1');
    } else {
      setPrevQuestion(null);
      setStudyCardVisible(false);
    }
    setCurrentQ(next);
    setSelectedAnswer(null);
    setPreselectedAnswer(null);
    setPhase('selecting');
    setRemovedOptions([]);
    setPhoneHint(null);
    setCommentatorText(null);
    commentGeneratedRef.current = false;
    helpfulUsedThisQRef.current = false;
    if (next === 10) {
      setUsedLifelines((prev) => ({
        ...prev,
        bible: Math.max(0, prev.bible - 1),
        grace: false,
      }));
    }
  }

  function handleTierWalkAway() {
    onGameEnd({
      finalAmount: PRIZE_AMOUNTS[tierCompleteNextQ],
      wonGame: false,
      walkedAway: true,
      lastCorrectQuestion: tierCompleteNextQ - 1,
    });
  }

  // ─── Bible lifeline ──────────────────────────────────────────────────────

  const handleBible = useCallback(() => {
    const used = usedLifelines.bible;
    if (used >= 3 || phase !== 'selecting' || !currentQuestion?.reference) return;
    const refs = parseBibleRef(currentQuestion.reference);
    const displayRef = used === 0 ? refs.precise : used === 1 ? refs.chapter : refs.book;
    setUsedLifelines((prev) => ({ ...prev, bible: prev.bible + 1 }));
    setBibleRef(displayRef);
    setBibleStage(used);
    setShowBibleModal(true);
  }, [usedLifelines, phase, currentQuestion]);

  const currentPrize      = PRIZE_AMOUNTS[currentQ + 1] ?? PRIZE_AMOUNTS[PRIZE_AMOUNTS.length - 1];
  const formattedPrize    = currentPrize.toLocaleString(language === 'de' ? 'de-DE' : 'en-US');
  const walkAwayAmount    = Math.max(currentQ > 0 ? PRIZE_AMOUNTS[currentQ] : 0, getSafeAmount(currentQ));
  const formattedWalkAway = walkAwayAmount.toLocaleString(language === 'de' ? 'de-DE' : 'en-US');

  const diff = currentQuestion?.difficulty ?? 1;

  return (
    <div className="quiz-stage min-h-screen flex flex-col" data-diff={diff}>
      {/* Ambient light layer — sits behind all content (z-index:0) */}
      <div className="quiz-ambient" aria-hidden="true" />

      {/* Top bar — z-20 keeps it above ambient */}
      <header className="sticky top-0 z-20 bg-brand-dark/80 backdrop-blur border-b border-brand-gold/15 px-4 py-3 landscape:py-1.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <h1 className="font-display text-brand-gold text-sm sm:text-base font-bold tracking-wide hidden sm:block">
            {t('app.title')}
          </h1>

          {/* Lifelines — desktop only in header; on mobile they sit below the prize banner */}
          <div className="hidden sm:flex flex-1 justify-center">
            <Lifelines
              usedLifelines={usedLifelines}
              onFiftyFifty={handleFiftyFifty}
              onAudience={handleAudience}
              onPhone={handlePhone}
              onGrace={handleGrace}
              onBible={handleBible}
              hasBibleRef={!!currentQuestion?.reference}
              phase={phase}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <button
              className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors text-sm ${
                prevQuestion?.reference
                  ? studyCardVisible
                    ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                    : 'border-brand-gold/40 text-brand-gold/60 hover:border-brand-gold hover:text-brand-gold'
                  : 'border-brand-gold/15 text-brand-gold/25 cursor-default'
              }`}
              onClick={() => prevQuestion?.reference && setStudyCardVisible((v) => !v)}
              aria-label={t('game.study_card_title')}
              title={t('game.study_card_title')}
            >
              📖
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full border border-brand-gold/30 text-brand-gold/70 hover:border-brand-gold hover:text-brand-gold transition-colors text-sm font-bold font-display"
              onClick={() => setShowRulesModal(true)}
              aria-label={t('rules.title')}
              title={t('rules.title')}
            >
              ?
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full border border-brand-gold/30 text-brand-gold/70 hover:border-brand-gold hover:text-brand-gold transition-colors text-base"
              onClick={cycleAudioMode}
              aria-label={audioMode === 'all' ? 'Sound & music on' : audioMode === 'sfx' ? 'SFX only, music off' : 'Muted'}
              title={audioMode === 'all' ? 'Click: music off' : audioMode === 'sfx' ? 'Click: mute all' : 'Click: sound on'}
            >
              {audioMode === 'all' ? '🔊' : audioMode === 'sfx' ? '🔉' : '🔇'}
            </button>
            <button
              className="sm:hidden px-2 py-1 text-xs rounded border border-brand-gold/30 text-brand-gold/70 hover:border-brand-gold hover:text-brand-gold transition-colors"
              onClick={() => setShowLadder((v) => !v)}
              aria-label="Toggle prize ladder"
            >
              🏆
            </button>
          </div>
        </div>
      </header>

      {/* Main content — relative z-10 floats above the ambient overlay */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 py-6 landscape:py-3 flex gap-6">
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {showLadder && (
            <div className="sm:hidden rounded-xl border border-brand-gold/20 bg-brand-navy/60 p-4 max-h-64 overflow-y-auto">
              <PrizeLadder currentQuestion={currentQ} />
            </div>
          )}

          {/* Lifelines — mobile only, below prize banner */}
          <div className="sm:hidden">
            <Lifelines
              usedLifelines={usedLifelines}
              onFiftyFifty={handleFiftyFifty}
              onAudience={handleAudience}
              onPhone={handlePhone}
              onGrace={handleGrace}
              onBible={handleBible}
              hasBibleRef={!!currentQuestion?.reference}
              phase={phase}
            />
          </div>

          <div
            key={currentQ}
            className={transitioning ? 'animate-question-exit pointer-events-none' : 'animate-fade-in'}
          >
            <QuestionArea
              question={currentQuestion}
              questionNumber={currentQ + 1}
              totalQuestions={questions.length}
              formattedPrize={formattedPrize}
              preselectedAnswer={preselectedAnswer}
              selectedAnswer={selectedAnswer}
              phase={phase}
              removedOptions={removedOptions}
              onPreselect={handlePreselect}
              onConfirm={handleConfirm}
            />

            {/* Walk away — full-width two-click confirm below answers */}
            {phase === 'selecting' && (
              <button
                className={`mt-4 w-full py-3 px-6 rounded-xl font-display font-semibold text-sm border transition-all ${
                  preselectedWalkAway
                    ? 'border-red-400 bg-red-500/15 text-red-300 animate-pulse'
                    : 'border-red-500/25 text-red-400/60 hover:border-red-400/50 hover:text-red-400/90'
                }`}
                onClick={() => {
                  if (preselectedWalkAway) handleWalkAway();
                  else setPreselectedWalkAway(true);
                }}
                aria-pressed={preselectedWalkAway}
              >
                {preselectedWalkAway
                  ? t('game.walkaway_confirm', { amount: formattedWalkAway })
                  : t('game.walkaway')}
              </button>
            )}
          </div>
        </div>

        {/* Prize ladder (desktop) */}
        <aside className="hidden sm:flex flex-col w-44 lg:w-52 flex-shrink-0">
          <div className="sticky top-24 rounded-xl border border-brand-gold/20 bg-brand-navy/60 p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
            <PrizeLadder currentQuestion={currentQ} />
          </div>
        </aside>
      </main>

      {/* Commentator floating bubble */}
      {commentatorVisible && commentatorText && phase === 'selecting' && (
        <div className="fixed inset-x-0 top-16 z-30 flex justify-center px-4 pointer-events-none animate-fade-in">
          <button
            className="pointer-events-auto max-w-md w-full flex items-start gap-3 px-4 py-3 rounded-xl border border-brand-gold/30 bg-brand-dark/95 backdrop-blur-sm shadow-2xl shadow-brand-gold/10 text-left"
            onClick={() => setCommentatorVisible(false)}
            aria-label="Moderator-Kommentar"
          >
            <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden="true">🎤</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-display text-brand-gold/50 uppercase tracking-wider mb-0.5">
                {t('game.commentator')}
              </p>
              <p className="text-sm text-slate-400 italic leading-relaxed">
                &ldquo;{commentatorText}&rdquo;
              </p>
            </div>
            <span className="text-slate-600 hover:text-slate-400 text-sm flex-shrink-0 mt-0.5 transition-colors" aria-hidden="true">✕</span>
          </button>
        </div>
      )}

      {/* Audience modal */}
      {showAudienceModal && audienceVotes && (
        <AudienceModal
          votes={audienceVotes}
          removedOptions={removedOptions}
          onClose={() => setShowAudienceModal(false)}
        />
      )}

      {/* Grace of God modal */}
      {showGraceModal && graceResult && (
        <GraceModal result={graceResult} onClose={closeGraceModal} />
      )}

      {/* Bible lifeline modal */}
      {showBibleModal && bibleRef && (
        <BibleModal
          reference={bibleRef}
          stage={bibleStage}
          remaining={3 - usedLifelines.bible}
          lang={language}
          onClose={() => setShowBibleModal(false)}
        />
      )}

      {/* Phone modal */}
      {showPhoneModal && phoneHint && (
        <div className="modal-overlay" onClick={() => setShowPhoneModal(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="phone-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-brand-gold text-xl">📞</span>
                <h2 id="phone-modal-title" className="font-display font-bold text-brand-gold text-lg">
                  {t('game.phone_title')}
                </h2>
              </div>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-xl flex-shrink-0">
                👤
              </div>
              <div>
                <p className="text-brand-gold text-sm font-semibold mb-1">{t('game.phone_friend')}</p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {phoneHint.confident ? t('game.phone_confident') : t('game.phone_uncertain')}
                </p>
                <p className="text-brand-gold font-bold mt-2 text-base">
                  {phoneHint.letter}: {phoneHint.text}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPhoneModal(false)}
              className="w-full py-2 rounded-lg bg-brand-gold/20 border border-brand-gold/40 text-brand-gold font-semibold hover:bg-brand-gold/30 transition-colors text-sm"
            >
              {t('game.yes')}, {t('game.phone_thanks')}
            </button>
          </div>
        </div>
      )}

      {/* Tier complete celebration modal */}
      {tierCompleteNextQ !== null && (() => {
        const titleKey = tierCompleteNextQ === 5 ? 'game.tier_complete_q5_title'
                       : tierCompleteNextQ === 10 ? 'game.tier_complete_q10_title'
                       : 'game.tier_complete_q14_title';
        const subKey = tierCompleteNextQ === 5 ? 'game.tier_complete_q5_sub'
                     : tierCompleteNextQ === 10 ? 'game.tier_complete_q10_sub'
                     : 'game.tier_complete_q14_sub';
        const locale = language === 'de' ? 'de-DE' : 'en-US';
        const isMillionRound = tierCompleteNextQ === 14;
        const walkAwayAmount = PRIZE_AMOUNTS[tierCompleteNextQ].toLocaleString(locale);
        const displayAmount  = isMillionRound
          ? PRIZE_AMOUNTS[15].toLocaleString(locale)
          : walkAwayAmount;
        const fallbackAmount = PRIZE_AMOUNTS[10].toLocaleString(locale);
        return (
          <div className="modal-overlay">
            <div className="modal-card text-center" role="dialog" aria-modal="true" aria-labelledby="tier-complete-title">
              <div className="mb-5">
                <svg viewBox="0 0 80 100" className="w-16 h-20 mx-auto drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]" aria-hidden="true">
                  <defs>
                    <linearGradient id="tcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f0c040" />
                      <stop offset="50%" stopColor="#d4af37" />
                      <stop offset="100%" stopColor="#b8960c" />
                    </linearGradient>
                  </defs>
                  <rect x="34" y="5" width="12" height="90" rx="3" fill="url(#tcGrad)" />
                  <rect x="10" y="28" width="60" height="12" rx="3" fill="url(#tcGrad)" />
                </svg>
              </div>
              <h2 id="tier-complete-title" className="font-display font-black text-2xl text-gold-gradient mb-2 leading-tight">
                {t(titleKey)}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">{t(subKey)}</p>
              {tierCompleteNextQ === 10 && (
                <p className="text-brand-gold/70 text-xs mt-2 mb-5 font-display">✦ {t('game.tier_complete_q10_lifelines')}</p>
              )}
              {tierCompleteNextQ !== 10 && <div className="mb-5" />}
              <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/5 px-5 py-4 mb-6">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-display mb-1">
                  {t(isMillionRound ? 'game.tier_playing_for' : 'game.tier_secured')}
                </p>
                <p className="font-display font-black text-3xl text-gold-gradient leading-none">{displayAmount}</p>
                <p className="text-brand-gold/60 text-xs mt-1">{t('currency')}</p>
                {isMillionRound && (
                  <p className="text-slate-500 text-xs mt-2 leading-snug">
                    {t('game.tier_fallback', { amount: fallbackAmount })}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleTierContinue}
                  className="w-full py-3 px-6 rounded-xl font-display font-bold text-base bg-gradient-to-br from-brand-gold via-brand-gold-light to-brand-gold text-brand-dark shadow-lg shadow-brand-gold/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  {t('game.tier_continue')}
                </button>
                <button
                  onClick={handleTierWalkAway}
                  className="w-full py-2 px-6 rounded-xl font-display font-semibold text-sm border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all"
                >
                  {t('game.tier_take')} — {walkAwayAmount} {t('currency')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Rules modal */}
      {showRulesModal && (
        <div className="modal-overlay" onClick={() => setShowRulesModal(false)}>
          <div className="modal-card max-w-sm w-full" role="dialog" aria-modal="true" aria-labelledby="rules-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 id="rules-modal-title" className="font-display font-black text-brand-gold text-xl tracking-wide">
                {t('rules.title')}
              </h2>
              <button onClick={() => setShowRulesModal(false)} className="text-slate-400 hover:text-slate-200 transition-colors text-xl leading-none">✕</button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] pr-1 space-y-4 text-sm">
              <p className="text-slate-300 leading-relaxed">{t('rules.p1')}</p>
              <p className="text-slate-400 leading-relaxed">{t('rules.p2')}</p>

              <div>
                <p className="text-brand-gold/80 font-display font-semibold text-xs uppercase tracking-wider mb-2">{t('rules.lifelines_title')}</p>
                <ul className="space-y-1.5">
                  {[
                    ['game.lifeline_5050',    'rules.ll_fifty'],
                    ['game.lifeline_audience','rules.ll_audience'],
                    ['game.lifeline_phone',   'rules.ll_phone'],
                    ['game.lifeline_grace',   'rules.ll_grace'],
                    ['game.lifeline_bible',   'rules.ll_bible'],
                  ].map(([nameKey, descKey]) => (
                    <li key={nameKey} className="flex gap-2">
                      <span className="text-brand-gold/60 font-semibold flex-shrink-0">{t(nameKey)}:</span>
                      <span className="text-slate-400">{t(descKey)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-brand-gold/80 font-display font-semibold text-xs uppercase tracking-wider mb-1">{t('rules.safe_title')}</p>
                <p className="text-slate-400 leading-relaxed">{t('rules.safe_text')}</p>
              </div>

              <div>
                <p className="text-brand-gold/80 font-display font-semibold text-xs uppercase tracking-wider mb-1">{t('rules.walkaway_title')}</p>
                <p className="text-slate-400 leading-relaxed">{t('rules.walkaway_text')}</p>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="mt-5 w-full py-2.5 rounded-lg bg-brand-gold/20 border border-brand-gold/50 text-brand-gold font-display font-bold tracking-widest hover:bg-brand-gold/35 transition-colors text-sm"
            >
              {t('rules.close')}
            </button>
          </div>
        </div>
      )}

      {/* Floating study card — fixed below header, does not push content */}
      {studyCardVisible && prevQuestion?.reference && (
        <div className="fixed top-[4.5rem] sm:top-24 inset-x-0 z-[21] px-4 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div className="animate-fade-in mt-2 rounded-xl border border-brand-gold/30 bg-brand-dark/95 backdrop-blur-sm shadow-xl shadow-brand-gold/10 px-4 py-3 flex items-start gap-3">
              <span className="text-brand-gold text-base flex-shrink-0 mt-0.5" aria-hidden="true">📖</span>
              <div className="flex-1 min-w-0">
                <p className="text-brand-gold/65 text-xs font-display uppercase tracking-wider mb-1">
                  {t('game.study_card_title')}
                </p>
                <p className="text-slate-400 text-xs leading-snug mb-1.5 line-clamp-2">
                  {prevQuestion.text}
                </p>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-slate-500">
                    <span className="mr-1">{t('game.study_card_read_in')}</span>
                    <BibleRefLink reference={prevQuestion.reference} lang={language} className="text-brand-gold/80 font-semibold" />
                  </p>
                  <button
                    onClick={() => {
                      if (autoShowStudy) {
                        localStorage.setItem(HIDE_STUDY_KEY, '1');
                        setAutoShowStudy(false);
                        setStudyCardVisible(false);
                      } else {
                        localStorage.removeItem(HIDE_STUDY_KEY);
                        setAutoShowStudy(true);
                      }
                    }}
                    className="text-slate-600 hover:text-slate-400 text-xs transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    {autoShowStudy ? t('game.study_card_disable') : t('game.study_card_enable')}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setStudyCardVisible(false)}
                className="text-slate-600 hover:text-slate-400 transition-colors text-sm flex-shrink-0 mt-0.5"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
