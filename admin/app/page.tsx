'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'

export default function Page() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  const [profiles, setProfiles] = useState<any[]>([])
  const [images, setImages] = useState<any[]>([])
  const [captions, setCaptions] = useState<any[]>([])

  const [imagePage, setImagePage] = useState(1)
  const [profilePage, setProfilePage] = useState(1)
  const [captionPage, setCaptionPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const fetchAll = async (currentImagePage: number, currentProfilePage: number, currentCaptionPage: number) => {
    const imageFrom = (currentImagePage - 1) * ITEMS_PER_PAGE
    const imageTo = imageFrom + ITEMS_PER_PAGE - 1

    const profileFrom = (currentProfilePage - 1) * ITEMS_PER_PAGE
    const profileTo = profileFrom + ITEMS_PER_PAGE - 1

    const captionFrom = (currentCaptionPage - 1) * ITEMS_PER_PAGE
    const captionTo = captionFrom + ITEMS_PER_PAGE - 1

    const [profilesRes, imagesRes, captionsRes] = await Promise.all([
      supabase.from('profiles').select('*').range(profileFrom, profileTo),
      supabase.from('images').select('*').range(imageFrom, imageTo),
      // 👇 updated to also fetch image_description
      supabase.from('captions').select('*, images(url, image_description)').range(captionFrom, captionTo),
    ])

    if (!profilesRes.error) setProfiles(profilesRes.data)
    if (!imagesRes.error) setImages(imagesRes.data)
    if (!captionsRes.error) setCaptions(captionsRes.data)
  }

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null

      setUser(user)

      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_superadmin')
          .eq('id', user.id)
          .single()

        if (!error) {
          const admin = data?.is_superadmin ?? false
          setIsAdmin(admin)
          if (admin) await fetchAll(1, 1, 1)
        } else {
          setIsAdmin(false)
        }
      }
    }

    loadUser()

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetchAll(imagePage, profilePage, captionPage)
  }, [imagePage, profilePage, captionPage])

  const refreshImages = async () => {
    const from = (imagePage - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    const { data, error } = await supabase.from('images').select('*').range(from, to)
    if (!error) setImages(data)
  }

  const updateImage = async (id: string, newUrl: string) => {
    const { error } = await supabase.from('images').update({ url: newUrl }).eq('id', id)
    if (!error) refreshImages()
  }

  const deleteImage = async (id: string) => {
    const { error } = await supabase.from('images').delete().eq('id', id)
    if (!error) refreshImages()
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' }
      }
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(null)
    setProfiles([])
    setImages([])
    setCaptions([])
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>Login</h2>
        <button onClick={loginWithGoogle}>Sign in with Google</button>
      </div>
    )
  }

  if (isAdmin === null) {
    return <p style={{ textAlign: 'center' }}>Loading...</p>
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <p>Logged in as: {user.email}</p>

      {isAdmin ? (
        <h1 style={{ color: 'green' }}>YES (Admin)</h1>
      ) : (
        <h1 style={{ color: 'red' }}>NO</h1>
      )}

      <button onClick={logout}>Sign Out</button>

      {isAdmin ? (
        <>
          {/* PROFILES TABLE */}
          <h2>
            <button
              onClick={() => setProfilePage((prev) => Math.max(prev - 1, 1))}
              disabled={profilePage === 1}
              style={{ marginRight: '12px' }}
            >⬅️</button>
            Profiles (Page {profilePage})
            <button
              onClick={() => setProfilePage((prev) => prev + 1)}
              disabled={profiles.length < ITEMS_PER_PAGE}
              style={{ marginLeft: '12px' }}
            >➡️</button>
          </h2>
          <table border={1} style={{ margin: '0 auto', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px' }}>ID</th>
                <th style={{ padding: '8px' }}>First Name</th>
                <th style={{ padding: '8px' }}>Last Name</th>
                <th style={{ padding: '8px' }}>Email</th>
                <th style={{ padding: '8px' }}>Superadmin</th>
                <th style={{ padding: '8px' }}>In Study</th>
                <th style={{ padding: '8px' }}>Matrix Admin</th>
                <th style={{ padding: '8px' }}>Created</th>
                <th style={{ padding: '8px' }}>Modified</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td style={{ padding: '8px' }}>{profile.id}</td>
                  <td style={{ padding: '8px' }}>{profile.first_name}</td>
                  <td style={{ padding: '8px' }}>{profile.last_name}</td>
                  <td style={{ padding: '8px' }}>{profile.email}</td>
                  <td style={{ padding: '8px' }}>{profile.is_superadmin ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px' }}>{profile.is_in_study ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px' }}>{profile.is_matrix_admin ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px' }}>{new Date(profile.created_datetime_utc).toLocaleString()}</td>
                  <td style={{ padding: '8px' }}>{new Date(profile.modified_datetime_utc).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* IMAGES TABLE */}
          <h2>
            <button
              onClick={() => setImagePage((prev) => Math.max(prev - 1, 1))}
              disabled={imagePage === 1}
              style={{ marginRight: '12px' }}
            >⬅️</button>
            Images (Page {imagePage})
            <button
              onClick={() => setImagePage((prev) => prev + 1)}
              disabled={images.length < ITEMS_PER_PAGE}
              style={{ marginLeft: '12px' }}
            >➡️</button>
          </h2>
          <table border={1} style={{ margin: '0 auto', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px' }}>ID</th>
                <th style={{ padding: '8px' }}>Preview</th>
                <th style={{ padding: '8px' }}>URL</th>
                <th style={{ padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img) => (
                <tr key={img.id}>
                  <td style={{ padding: '8px' }}>{img.id}</td>
                  <td style={{ padding: '8px' }}>
                    <img src={img.url} alt="" width={80} />
                  </td>
                  <td style={{ padding: '8px' }}>{img.url}</td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => deleteImage(img.id)}>Delete</button>
                    <button
                      style={{ marginLeft: '6px' }}
                      onClick={() => updateImage(img.id, prompt('New URL?') || img.url)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* CAPTIONS TABLE */}
          <h2>
            <button
              onClick={() => setCaptionPage((prev) => Math.max(prev - 1, 1))}
              disabled={captionPage === 1}
              style={{ marginRight: '12px' }}
            >⬅️</button>
            Captions (Page {captionPage})
            <button
              onClick={() => setCaptionPage((prev) => prev + 1)}
              disabled={captions.length < ITEMS_PER_PAGE}
              style={{ marginLeft: '12px' }}
            >➡️</button>
          </h2>
          <table border={1} style={{ margin: '0 auto', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px' }}>ID</th>
                <th style={{ padding: '8px' }}>Image</th>
                {/* 👇 new column */}
                <th style={{ padding: '8px' }}>Image Description</th>
                <th style={{ padding: '8px' }}>Caption</th>
                <th style={{ padding: '8px' }}>Visibility</th>
                <th style={{ padding: '8px' }}>Likes</th>
                <th style={{ padding: '8px' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {captions.map((caption) => (
                <tr key={caption.id}>
                  <td style={{ padding: '8px' }}>{caption.id}</td>
                  <td style={{ padding: '8px' }}>
                    {caption.images?.url ? (
                      <img src={caption.images.url} alt="" width={80} />
                    ) : (
                      'No image'
                    )}
                  </td>
                  {/* 👇 new column */}
                  <td style={{ padding: '8px', maxWidth: '200px' }}>
                    {caption.images?.image_description ?? '—'}
                  </td>
                  <td style={{ padding: '8px', maxWidth: '200px' }}>{caption.content}</td>
                  <td style={{ padding: '8px' }}>{caption.is_public ? '🌐 Public' : '🔒 Private'}</td>
                  <td style={{ padding: '8px' }}>{caption.like_count}</td>
                  <td style={{ padding: '8px' }}>{new Date(caption.created_datetime_utc).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p style={{ color: 'red', marginTop: '20px' }}>
          You do not have permission to view this content.
        </p>
      )}
    </div>
  )
}
