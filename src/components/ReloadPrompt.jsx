import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

function ReloadPrompt() {
  const {
    offlineReady: offlineReadyState,
    needUpdate: needUpdateState,
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r)
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })

  const [offlineReady, setOfflineReady] = Array.isArray(offlineReadyState) ? offlineReadyState : [!!offlineReadyState, () => {}]
  const [needUpdate, setNeedUpdate] = Array.isArray(needUpdateState) ? needUpdateState : [!!needUpdateState, () => {}]

  const close = () => {
    if (typeof setOfflineReady === 'function') setOfflineReady(false)
    if (typeof setNeedUpdate === 'function') setNeedUpdate(false)
  }

  if (!offlineReady && !needUpdate) {
    return null
  }

  return (
    <div className="pwa-toast">
      <div className="pwa-message">
        {offlineReady ? (
          <span>App pronto para uso offline!</span>
        ) : (
          <span>Nova versão disponível! Deseja atualizar?</span>
        )}
      </div>
      <div className="pwa-actions">
        {needUpdate && (
          <button className="pwa-button pwa-button-update" onClick={() => updateServiceWorker(true)}>
            Atualizar
          </button>
        )}
        <button className="pwa-button pwa-button-close" onClick={() => close()}>
          Fechar
        </button>
      </div>
      <style>{`
        .pwa-toast {
          position: fixed;
          right: 0;
          bottom: 0;
          margin: 16px;
          padding: 16px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          z-index: 9999;
          text-align: left;
          box-shadow: var(--shadow-lg);
          background-color: var(--card-bg);
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 300px;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .pwa-message {
          font-weight: 600;
          color: var(--primary-color);
        }
        .pwa-actions {
          display: flex;
          gap: 8px;
        }
        .pwa-button {
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 600;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }
        .pwa-button-update {
          background-color: var(--accent-color);
          color: #000;
        }
        .pwa-button-update:hover {
          background-color: var(--accent-hover);
        }
        .pwa-button-close {
          background-color: transparent;
          border: 1px solid var(--border-color);
        }
        .pwa-button-close:hover {
          background-color: #f9fafb;
        }
      `}</style>
    </div>
  )
}

export default ReloadPrompt
