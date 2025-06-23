// Supabase Edge Function for Sending Booking Confirmation Emails

import { createClient } from '@supabase/supabase-js'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SendGridClient } from 'https://esm.sh/@sendgrid/mail@7.7.0'

// Initialize SendGrid
const sgMail = new SendGridClient()
sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY'))
const fromEmail = Deno.env.get('FROM_EMAIL')

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the booking data from the request
    const { booking } = await req.json()
    
    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'Booking data is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get location and package details if not provided
    let locationName = booking.location || ''
    let packageName = booking.package || ''
    
    if (booking.location_id && !locationName) {
      const { data: location } = await supabaseClient
        .from('locations')
        .select('name')
        .eq('id', booking.location_id)
        .single()
      
      if (location) {
        locationName = location.name
      }
    }
    
    if (booking.package_id && !packageName) {
      const { data: packageData } = await supabaseClient
        .from('packages')
        .select('name')
        .eq('id', booking.package_id)
        .single()
      
      if (packageData) {
        packageName = packageData.name
      }
    }

    // Format date for display
    const formattedDate = booking.booking_date ? new Date(booking.booking_date).toLocaleDateString('en-IE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Not specified'

    // Prepare email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #ff5a5f;">Fitzone Party Booking Confirmation</h1>
        </div>
        
        <p>Dear ${booking.parent_name || 'Valued Customer'},</p>
        
        <p>Thank you for booking a party with Fitzone! We're excited to host you and make this a special day for ${booking.child_name || 'your child'}.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #ff5a5f; margin-top: 0;">Booking Details</h2>
          <p><strong>Location:</strong> ${locationName}</p>
          <p><strong>Package:</strong> ${packageName}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${booking.booking_time || booking.time || 'Not specified'}</p>
          <p><strong>Child's Name:</strong> ${booking.child_name || 'Not specified'}</p>
          <p><strong>Child's Age:</strong> ${booking.child_age || 'Not specified'}</p>
          <p><strong>Number of Guests:</strong> ${booking.num_children || booking.numGuests || 'Not specified'}</p>
          <p><strong>Special Requests:</strong> ${booking.special_requests || booking.specialRequests || 'None'}</p>
          <p><strong>Total Price:</strong> €${(booking.total_price || 0).toFixed(2)}</p>
        </div>
        
        <p>Please arrive 15 minutes before your scheduled time. If you need to make any changes to your booking, please contact us at least 48 hours in advance.</p>
        
        <p>If you have any questions, please don't hesitate to contact us:</p>
        <p>Phone: 01 2191827 (Leopardstown) / 01 8530353 (Clontarf) / 01 8025906 (Westmanstown)</p>
        <p>Email: info@fitzoneparties.ie</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 14px;">© ${new Date().getFullYear()} Fitzone Parties | Powered by West Wood Club</p>
        </div>
      </div>
    `

    // Send email
    const msg = {
      to: booking.email,
      from: fromEmail,
      subject: 'Your Fitzone Party Booking Confirmation',
      html: emailHtml,
    }

    await sgMail.send(msg)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Confirmation email sent successfully' 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send confirmation email',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
