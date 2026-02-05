import React, { useState, useEffect } from 'react';

export default function AnimatedBackground() {
  const [imagesLoaded, setImagesLoaded] = useState({
    emspLogo: false,
    allonsLogo: false,
    students: [false, false, false, false, false, false]
  });

  useEffect(() => {
    // Vérifier si les images existent après le chargement
    const checkImages = () => {
      const emspImg = new Image();
      emspImg.onload = () => setImagesLoaded(prev => ({ ...prev, emspLogo: true }));
      emspImg.onerror = () => setImagesLoaded(prev => ({ ...prev, emspLogo: false }));
      emspImg.src = '/images/logos/emsp-logo.png';

      const allonsImg = new Image();
      allonsImg.onload = () => setImagesLoaded(prev => ({ ...prev, allonsLogo: true }));
      allonsImg.onerror = () => setImagesLoaded(prev => ({ ...prev, allonsLogo: false }));
      allonsImg.src = '/images/logos/emsp-allons-logo.png';

      // Vérifier les images d'étudiants
      for (let i = 0; i < 6; i++) {
        const studentImg = new Image();
        const index = i;
        studentImg.onload = () => {
          setImagesLoaded(prev => {
            const newStudents = [...prev.students];
            newStudents[index] = true;
            return { ...prev, students: newStudents };
          });
        };
        studentImg.onerror = () => {
          setImagesLoaded(prev => {
            const newStudents = [...prev.students];
            newStudents[index] = false;
            return { ...prev, students: newStudents };
          });
        };
        studentImg.src = `/images/students/student-${index + 1}.png`;
      }
    };

    checkImages();
  }, []);

  return (
    <div className="animated-background">
      {/* Logo EMSP principal (logo de l'école) */}
      <div className="background-logo background-logo--emsp">
        <img 
          src="/images/logos/emsp-logo.png" 
          alt="EMSP - Ecole Multinationale Supérieure des Postes d'Abidjan"
          className="logo-image logo-image--emsp"
          onError={(e) => {
            try {
              // Fallback si l'image n'existe pas encore
              e.target.style.display = 'none';
              const fallback = e.target.nextElementSibling;
              if (fallback) {
                fallback.classList.add('show-fallback');
              }
            } catch (err) {
              console.warn('Erreur fallback logo EMSP:', err);
            }
          }}
        />
        <div className={`logo-emsp logo-emsp--fallback ${!imagesLoaded.emspLogo ? 'show-fallback' : ''}`}>
          <div className="logo-emsp__africa">
            <div className="logo-emsp__sun"></div>
            <div className="logo-emsp__envelopes">
              <div className="envelope"></div>
              <div className="envelope"></div>
              <div className="envelope"></div>
            </div>
          </div>
          <div className="logo-emsp__text">EMSP</div>
        </div>
      </div>

      {/* Logo EMSP Allons! (logo transport) */}
      <div className="background-logo background-logo--allons">
        <img 
          src="/images/logos/emsp-allons-logo.png" 
          alt="EMSP Allons! - Transport Management"
          className="logo-image logo-image--allons"
          onError={(e) => {
            try {
              // Fallback si l'image n'existe pas encore
              e.target.style.display = 'none';
              const fallback = e.target.nextElementSibling;
              if (fallback) {
                fallback.classList.add('show-fallback');
              }
            } catch (err) {
              console.warn('Erreur fallback logo Allons:', err);
            }
          }}
        />
        <div className={`logo-allons logo-allons--fallback ${!imagesLoaded.allonsLogo ? 'show-fallback' : ''}`}>
          <div className="logo-allons__circle">
            <div className="logo-allons__gear"></div>
            <div className="logo-allons__car">
              <div className="car-front"></div>
              <div className="car-back"></div>
              <div className="car-windows">
                <div className="car-window"></div>
                <div className="car-window"></div>
                <div className="car-window"></div>
              </div>
            </div>
            <div className="logo-allons__text-emsp">EMSP</div>
            <div className="logo-allons__text-transport">TRANSPORT MANAGEMENT</div>
          </div>
        </div>
      </div>

      {/* Étudiants animés (images) */}
      <div className="animated-students">
        <div className="student-wrapper student-wrapper--1">
          <img 
            src="/images/students/student-1.png" 
            alt="Étudiant"
            className="student-image student-image--1"
            onError={(e) => {
              try {
                e.target.style.display = 'none';
                const fallback = e.target.parentElement?.querySelector('.student-icon--fallback');
                if (fallback) {
                  fallback.classList.add('show-fallback');
                }
              } catch (err) {
                console.warn('Erreur fallback étudiant:', err);
              }
            }}
          />
          <div className={`student-icon student-icon--1 student-icon--fallback ${!imagesLoaded.students[0] ? 'show-fallback' : ''}`}>👨‍🎓</div>
        </div>
        
        <div className="student-wrapper student-wrapper--2">
          <img 
            src="/images/students/student-2.png" 
            alt="Étudiante"
            className="student-image student-image--2"
            onError={(e) => {
              try {
                e.target.style.display = 'none';
                const fallback = e.target.parentElement?.querySelector('.student-icon--fallback');
                if (fallback) {
                  fallback.classList.add('show-fallback');
                }
              } catch (err) {
                console.warn('Erreur fallback étudiant:', err);
              }
            }}
          />
          <div className={`student-icon student-icon--2 student-icon--fallback ${!imagesLoaded.students[1] ? 'show-fallback' : ''}`}>👩‍🎓</div>
        </div>
        
        <div className="student-wrapper student-wrapper--3">
          <img 
            src="/images/students/student-3.png" 
            alt="Étudiant"
            className="student-image student-image--3"
            onError={(e) => {
              try {
                e.target.style.display = 'none';
                const fallback = e.target.parentElement?.querySelector('.student-icon--fallback');
                if (fallback) {
                  fallback.classList.add('show-fallback');
                }
              } catch (err) {
                console.warn('Erreur fallback étudiant:', err);
              }
            }}
          />
          <div className={`student-icon student-icon--3 student-icon--fallback ${!imagesLoaded.students[2] ? 'show-fallback' : ''}`}>👨‍🎓</div>
        </div>
        
        <div className="student-wrapper student-wrapper--4">
          <img 
            src="/images/students/student-4.png" 
            alt="Étudiante"
            className="student-image student-image--4"
            onError={(e) => {
              try {
                e.target.style.display = 'none';
                const fallback = e.target.parentElement?.querySelector('.student-icon--fallback');
                if (fallback) {
                  fallback.classList.add('show-fallback');
                }
              } catch (err) {
                console.warn('Erreur fallback étudiant:', err);
              }
            }}
          />
          <div className={`student-icon student-icon--4 student-icon--fallback ${!imagesLoaded.students[3] ? 'show-fallback' : ''}`}>👩‍🎓</div>
        </div>
        
        <div className="student-wrapper student-wrapper--5">
          <img 
            src="/images/students/student-5.png" 
            alt="Étudiant"
            className="student-image student-image--5"
            onError={(e) => {
              try {
                e.target.style.display = 'none';
                const fallback = e.target.parentElement?.querySelector('.student-icon--fallback');
                if (fallback) {
                  fallback.classList.add('show-fallback');
                }
              } catch (err) {
                console.warn('Erreur fallback étudiant:', err);
              }
            }}
          />
          <div className={`student-icon student-icon--5 student-icon--fallback ${!imagesLoaded.students[4] ? 'show-fallback' : ''}`}>👨‍🎓</div>
        </div>
        
        <div className="student-wrapper student-wrapper--6">
          <img 
            src="/images/students/student-6.png" 
            alt="Étudiante"
            className="student-image student-image--6"
            onError={(e) => {
              try {
                e.target.style.display = 'none';
                const fallback = e.target.parentElement?.querySelector('.student-icon--fallback');
                if (fallback) {
                  fallback.classList.add('show-fallback');
                }
              } catch (err) {
                console.warn('Erreur fallback étudiant:', err);
              }
            }}
          />
          <div className={`student-icon student-icon--6 student-icon--fallback ${!imagesLoaded.students[5] ? 'show-fallback' : ''}`}>👩‍🎓</div>
        </div>
      </div>

      <style>{`
        .animated-background {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .background-logo {
          position: absolute;
          opacity: 0.08;
          animation: float 20s ease-in-out infinite;
        }

        .background-logo--emsp {
          top: 10%;
          left: 5%;
          width: 200px;
          height: 200px;
        }

        .background-logo--allons {
          bottom: 10%;
          right: 5%;
          width: 180px;
          height: 180px;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        /* Images des logos */
        .logo-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: opacity(0.08);
          animation: float 20s ease-in-out infinite;
        }

        .logo-image--emsp {
          animation-delay: 0s;
        }

        .logo-image--allons {
          animation-delay: 2s;
        }

        /* Fallback pour les logos */
        .logo-image {
          display: block;
        }

        .logo-emsp--fallback,
        .logo-allons--fallback {
          display: none;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .logo-emsp--fallback.show-fallback,
        .logo-allons--fallback.show-fallback {
          display: block;
        }

        /* Si l'image n'est pas chargée, afficher le fallback */
        .background-logo--emsp:has(.logo-image[style*="display: none"]) .logo-emsp--fallback,
        .background-logo--allons:has(.logo-image[style*="display: none"]) .logo-allons--fallback {
          display: block;
        }

        /* Logo EMSP (école) */
        .logo-emsp {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .logo-emsp__africa {
          width: 80%;
          height: 60%;
          background: #16a34a;
          border: 3px solid #0f172a;
          border-radius: 8px;
          position: relative;
          margin: 0 auto;
          clip-path: polygon(20% 0%, 80% 0%, 100% 40%, 90% 80%, 50% 100%, 10% 80%, 0% 40%);
        }

        .logo-emsp__sun {
          position: absolute;
          bottom: -20px;
          left: 10px;
          width: 40px;
          height: 40px;
          background: #facc15;
          border: 2px solid #0f172a;
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(250, 204, 21, 0.6);
          animation: sunRise 3s ease-in-out infinite;
        }

        .logo-emsp__sun::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120%;
          height: 120%;
          background: radial-gradient(circle, transparent 30%, #facc15 30%);
          border-radius: 50%;
        }

        @keyframes sunRise {
          0%, 100% {
            transform: translateY(0);
            box-shadow: 0 0 20px rgba(250, 204, 21, 0.6);
          }
          50% {
            transform: translateY(-5px);
            box-shadow: 0 0 30px rgba(250, 204, 21, 0.8);
          }
        }

        .logo-emsp__envelopes {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 5px;
        }

        .envelope {
          width: 20px;
          height: 15px;
          background: white;
          border: 2px solid #0f172a;
          position: relative;
          animation: envelopeFloat 2s ease-in-out infinite;
        }

        .envelope:nth-child(1) {
          animation-delay: 0s;
        }

        .envelope:nth-child(2) {
          animation-delay: 0.3s;
        }

        .envelope:nth-child(3) {
          animation-delay: 0.6s;
        }

        @keyframes envelopeFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .logo-emsp__text {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          font-weight: 700;
          font-size: 1.2rem;
          color: #0f172a;
          letter-spacing: 2px;
        }

        /* Logo EMSP Allons! (transport) */
        .logo-allons {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .logo-allons__circle {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 8px solid #16a34a;
          border-top-color: #facc15;
          position: relative;
          animation: rotate 30s linear infinite;
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .logo-allons__gear {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60%;
          height: 60%;
          border: 4px solid #22c55e;
          border-radius: 50%;
          background: transparent;
          animation: rotateReverse 20s linear infinite;
        }

        .logo-allons__gear::before {
          content: '';
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 20px;
          background: #22c55e;
          border-radius: 50%;
        }

        .logo-allons__gear::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 20px;
          background: #22c55e;
          border-radius: 50%;
        }

        @keyframes rotateReverse {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(-360deg);
          }
        }

        .logo-allons__car {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 50%;
          height: 30%;
        }

        .car-front {
          position: absolute;
          left: 0;
          top: 0;
          width: 50%;
          height: 100%;
          background: #facc15;
          border: 2px solid #0f172a;
          border-radius: 8px 0 0 8px;
        }

        .car-back {
          position: absolute;
          right: 0;
          top: 0;
          width: 50%;
          height: 100%;
          background: #22c55e;
          border: 2px solid #0f172a;
          border-radius: 0 8px 8px 0;
        }

        .car-windows {
          position: absolute;
          right: 5px;
          top: 5px;
          display: flex;
          gap: 3px;
        }

        .car-window {
          width: 8px;
          height: 8px;
          background: #0f172a;
          border-radius: 2px;
        }

        .logo-allons__text-emsp {
          position: absolute;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          font-weight: 700;
          font-size: 0.8rem;
          color: #0f172a;
          background: #16a34a;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .logo-allons__text-transport {
          position: absolute;
          bottom: 15%;
          left: 50%;
          transform: translateX(-50%);
          font-weight: 600;
          font-size: 0.6rem;
          color: #16a34a;
          letter-spacing: 1px;
        }

        /* Étudiants animés */
        .animated-students {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .student-wrapper {
          position: absolute;
        }

        /* Images des étudiants */
        .student-image {
          width: 60px;
          height: 60px;
          object-fit: contain;
          opacity: 0.12;
          animation: studentMove 15s ease-in-out infinite;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .student-wrapper--1 {
          top: 20%;
          left: 20%;
        }

        .student-image--1 {
          animation-delay: 0s;
        }

        .student-wrapper--2 {
          top: 40%;
          right: 15%;
        }

        .student-image--2 {
          animation-delay: 2s;
        }

        .student-wrapper--3 {
          bottom: 30%;
          left: 30%;
        }

        .student-image--3 {
          animation-delay: 4s;
        }

        .student-wrapper--4 {
          top: 60%;
          right: 25%;
        }

        .student-image--4 {
          animation-delay: 6s;
        }

        .student-wrapper--5 {
          bottom: 20%;
          left: 15%;
        }

        .student-image--5 {
          animation-delay: 8s;
        }

        .student-wrapper--6 {
          top: 30%;
          right: 40%;
        }

        .student-image--6 {
          animation-delay: 10s;
        }

        /* Fallback pour les étudiants (emojis) */
        .student-icon {
          font-size: 2rem;
          opacity: 0.1;
          animation: studentMove 15s ease-in-out infinite;
          display: none;
          position: absolute;
          top: 0;
          left: 0;
        }

        .student-icon--fallback.show-fallback {
          display: block;
        }

        /* Si l'image n'est pas chargée, afficher le fallback */
        .student-wrapper:has(.student-image[style*="display: none"]) .student-icon--fallback {
          display: block;
        }

        .student-icon--1 {
          animation-delay: 0s;
        }

        .student-icon--2 {
          animation-delay: 2s;
        }

        .student-icon--3 {
          animation-delay: 4s;
        }

        .student-icon--4 {
          animation-delay: 6s;
        }

        .student-icon--5 {
          animation-delay: 8s;
        }

        .student-icon--6 {
          animation-delay: 10s;
        }

        @keyframes studentMove {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            opacity: 0.12;
          }
          25% {
            transform: translate(20px, -20px) scale(1.1) rotate(5deg);
            opacity: 0.18;
          }
          50% {
            transform: translate(-15px, 15px) scale(0.9) rotate(-5deg);
            opacity: 0.15;
          }
          75% {
            transform: translate(10px, 10px) scale(1.05) rotate(3deg);
            opacity: 0.16;
          }
        }

        @media (max-width: 768px) {
          .background-logo {
            opacity: 0.05;
          }

          .background-logo--emsp {
            width: 120px;
            height: 120px;
          }

          .background-logo--allons {
            width: 100px;
            height: 100px;
          }

          .student-image {
            width: 40px;
            height: 40px;
          }

          .student-icon {
            font-size: 1.5rem;
          }

          .student-wrapper {
            position: absolute;
          }
        }
      `}</style>
    </div>
  );
}

